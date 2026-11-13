// Chequeo de solo lectura contra la base de producción — pensado para correr
// en el servidor con `npx tsx scripts/check-prod-db.ts` (o en local apuntando
// a la base que quieras, seteando DATABASE_URL antes). No modifica nada.
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import * as dotenv from "dotenv";

// .env.production (commiteado a git) es solo la PLANTILLA, con placeholders
// literales ("USER:PASSWORD@HOST") — los valores reales de producción van en
// .env.production.local (gitignored, convención propia de Next.js), que es
// el que realmente lee la app corriendo bajo pm2. Se intenta ese primero.
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: ".env.production.local" });
}
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: ".env.production" });
}

if (/USER:PASSWORD@HOST/.test(process.env.DATABASE_URL ?? "")) {
    console.error(
        "❌ DATABASE_URL es la plantilla sin completar (USER:PASSWORD@HOST), no la real.\n" +
        "   Este script leyó .env.production.local o .env.production buscando en el directorio\n" +
        "   actual — si la app corre con las credenciales en otro archivo o inyectadas por otra\n" +
        "   vía (pm2 env, systemd, etc.), corré el script pasando la URL real a mano:\n" +
        "   DATABASE_URL=\"postgresql://...\" npx tsx scripts/check-prod-db.ts"
    );
    process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })) });

async function tablaExiste(tableName: string): Promise<boolean> {
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = ${tableName}) as exists
    `;
    return rows[0]?.exists ?? false;
}

async function columnaExiste(tableName: string, columnName: string): Promise<boolean> {
    const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = ${tableName} AND column_name = ${columnName}
        ) as exists
    `;
    return rows[0]?.exists ?? false;
}

async function main() {
    const urlOculta = (process.env.DATABASE_URL ?? "").replace(/:[^:@]+@/, ":****@");
    console.log(`Conectando a: ${urlOculta || "(DATABASE_URL vacía)"}\n`);

    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Conexión a la base OK\n");

    console.log("== Schema (cambios de esta sesión) ==");
    const checks: [string, string][] = [
        ["pedidos", "payway_payment_id"],
        ["inscripciones_cursos", "payway_payment_id"],
        ["cuotas_mensuales", "payway_payment_id"],
    ];
    for (const [tabla, columna] of checks) {
        const ok = await columnaExiste(tabla, columna);
        console.log(`  ${ok ? "✅" : "❌ FALTA"} ${tabla}.${columna}`);
    }
    const tablaImport = await tablaExiste("importaciones_automaticas");
    console.log(`  ${tablaImport ? "✅" : "❌ FALTA"} tabla importaciones_automaticas`);
    if (!tablaImport || checks.length === 0) {
        console.log("  ⚠ Si falta algo acá, correr: npx prisma db push");
    }
    console.log();

    console.log("== Últimas 5 corridas del watcher de FTP (deudas) ==");
    if (tablaImport) {
        const ultimas = await prisma.importacionAutomatica.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
        if (ultimas.length === 0) {
            console.log("  (sin corridas todavía — normal si no se subió ningún archivo aún)");
        }
        for (const i of ultimas) {
            console.log(`  ${i.estado === "exitoso" ? "✅" : "❌"} ${i.createdAt.toISOString()} — ${i.archivo}: ${i.mensaje}`);
        }
    } else {
        console.log("  (tabla no existe todavía)");
    }
    console.log();

    console.log("== Últimos 5 pagos de deuda registrados (cualquier canal) ==");
    const pagos = await prisma.deudaPagada.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
    if (pagos.length === 0) console.log("  (sin pagos registrados todavía)");
    for (const p of pagos) {
        console.log(`  ${p.createdAt.toISOString()} — exp. ${p.expediente}: $${p.monto.toLocaleString("es-AR")} vía ${p.metodoPago}`);
    }
    console.log();

    console.log("== Config de PayWay (solo flags, sin secretos) ==");
    const configRows = await prisma.config.findMany({
        where: {
            clave: {
                in: [
                    "paywayAmbiente",
                    "paywaySiteId_production", "paywayPublicKey_production", "paywaySecretKey_production",
                    "paywaySiteId_developer", "paywayPublicKey_developer", "paywaySecretKey_developer",
                    "payway_matricula_mensual", "payway_matricula_anual", "payway_deuda", "payway_curso", "payway_ventas",
                ],
            },
        },
    });
    const map = Object.fromEntries(configRows.map(c => [c.clave, c.valor]));
    const ambiente = map.paywayAmbiente === "production" ? "production" : "developer";
    console.log(`  Ambiente activo: ${ambiente}`);
    console.log(`  Credenciales cargadas para ${ambiente}: ${!!(map[`paywaySiteId_${ambiente}`] && map[`paywayPublicKey_${ambiente}`] && map[`paywaySecretKey_${ambiente}`]) ? "sí" : "❌ NO — revisar /admin/config/pagos"}`);
    for (const key of ["payway_matricula_mensual", "payway_matricula_anual", "payway_deuda", "payway_curso", "payway_ventas"]) {
        console.log(`  ${key}: ${map[key] === "1" ? "habilitado" : "deshabilitado"}`);
    }
    console.log();

    console.log("== Certificados de matriculación bloqueados (certificados_manuales) ==");
    const bloqueados = await prisma.certificadoManual.findMany({ orderBy: { createdAt: "desc" } });
    console.log(`  Total bloqueados: ${bloqueados.length}`);
    if (bloqueados.length > 0) {
        const datos = await prisma.dato.findMany({
            where: { expediente: { in: bloqueados.map(b => b.expediente) } },
            select: { expediente: true, apellido: true, nombre: true },
        });
        const mapNombre = new Map(datos.map(d => [d.expediente, `${d.apellido}, ${d.nombre}`]));
        for (const b of bloqueados.slice(0, 50)) {
            console.log(`  - exp. ${b.expediente} (${mapNombre.get(b.expediente) ?? "sin Dato"}) — bloqueado el ${b.createdAt.toLocaleDateString("es-AR")}`);
        }
        if (bloqueados.length > 50) console.log(`  ... y ${bloqueados.length - 50} más`);
        console.log("  ⚠ No guarda motivo ni quién lo bloqueó — si alguno de estos no debería estar acá, sacarlo desde /admin/certificados-manuales.");
    }
    console.log();

    console.log("== Deudas vigentes (sanity check Deuda vs. DeudaComprobante) ==");
    const [totalDeudas, totalComprobantes] = await Promise.all([
        prisma.deuda.aggregate({ _sum: { monto: true }, _count: true }),
        prisma.deudaComprobante.aggregate({ _sum: { monto: true }, _count: true }),
    ]);
    console.log(`  Deuda: ${totalDeudas._count} expedientes, $${(totalDeudas._sum.monto ?? 0).toLocaleString("es-AR")} total`);
    console.log(`  DeudaComprobante: ${totalComprobantes._count} filas, $${(totalComprobantes._sum.monto ?? 0).toLocaleString("es-AR")} total`);
    const diff = Math.abs((totalDeudas._sum.monto ?? 0) - (totalComprobantes._sum.monto ?? 0));
    console.log(`  ${diff <= 1 ? "✅" : "⚠"} Diferencia entre ambos totales: $${diff.toLocaleString("es-AR")}${diff > 1 ? " (esperable si hay deudas sin comprobante o viceversa — revisar si es grande)" : ""}`);

    await prisma.$disconnect();
}

main().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
