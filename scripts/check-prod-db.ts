// Chequeo de solo lectura contra la base de producción — pensado para correr
// en el servidor con `npx tsx scripts/check-prod-db.ts` (o en local apuntando
// a la base que quieras, seteando DATABASE_URL antes). No modifica nada.
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import * as dotenv from "dotenv";

if (!process.env.DATABASE_URL) {
    dotenv.config({ path: ".env.production" });
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
