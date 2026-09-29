import prisma from "@/lib/prisma";
import { parseImporte } from "@/lib/parseImporte";

// Extraído de src/app/api/admin/importar/financiero/route.ts (tipo "deudas") para
// que el import manual (desde /admin/importar) y el automático por FTP (ver
// src/lib/ftpImportDeudas.ts) corran exactamente el mismo código — cero
// divergencia entre ambos caminos.

function normalizeKey(k: string) {
    return k.toLowerCase().trim().replace(/\s*\(\d+\)$/, "");
}

function getExpediente(row: Record<string, string>): string {
    const r = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeKey(k), v]));
    const exacta = r["expediente"] || r["usuario_sistema"] || r["usuario"] || r["exp"] || r["nro"] || r["numero"] || "";
    if (exacta.trim()) return exacta.trim();
    const partial = Object.entries(r).find(([k]) => k.includes("expediente"));
    return (partial?.[1] ?? "").trim();
}

function getMonto(row: Record<string, string>): number {
    const r = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeKey(k), v]));
    const exacta = r["monto"] || r["importe"] || r["deuda"] || r["valor"] || r["total"] || r["saldo"] || "";
    if (exacta.trim()) return parseImporte(exacta);
    const partial = Object.entries(r).find(([k]) => k.includes("importe") || k.includes("monto"));
    return parseImporte(partial?.[1] ?? "");
}

// Excel de "Cuenta Corriente - Deudas vencidas": trae una fila por comprobante impago.
// Cuando viene del import manual, el cliente (parseExcel) ya convirtió los seriales de
// Excel a fecha real antes de mandar los registros; cuando viene del watcher de FTP, el
// parseo server-side (ftpImportDeudas.ts) hace la misma conversión antes de llegar acá.
function getFechaVencimiento(row: Record<string, string>): Date | null {
    const r = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeKey(k), v]));
    const raw = r["fecha de vencimiento"] || r["fecha_vencimiento"] || r["vencimiento"] || "";
    const partial = raw.trim() ? raw : (Object.entries(r).find(([k]) => k.includes("vencimiento"))?.[1] ?? "");
    // Algunos exports traen la fecha como texto con año de 2 dígitos (ej. "30/9/19") —
    // se completa el siglo con el mismo pivot que usa Excel/COBOL: 00-68 → 20xx, 69-99 → 19xx.
    const m = String(partial).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (!m) return null;
    const [, d, mo, yRaw] = m;
    const y = yRaw.length === 2 ? (+yRaw <= 68 ? 2000 + +yRaw : 1900 + +yRaw) : +yRaw;
    const fecha = new Date(Date.UTC(y, +mo - 1, +d));
    if (isNaN(fecha.getTime()) || fecha.getUTCFullYear() !== y || fecha.getUTCMonth() !== +mo - 1 || fecha.getUTCDate() !== +d)
        return null;
    return fecha;
}

// La columna "Cliente" viene como "12009 - APELLIDO, NOMBRE" — el número inicial es
// el código de cliente interno, distinto del expediente. Se guarda por si hace falta
// cruzar con algo más adelante, no se usa todavía para nada funcional.
function getClienteNumero(row: Record<string, string>): string | null {
    const r = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeKey(k), v]));
    const cliente = r["cliente"] ?? "";
    const m = String(cliente).match(/^(\d+)\s*-\s*/);
    return m ? m[1] : null;
}

// "ZONA (Adic.)" / "SUBZONA (Adic.)" — determinan qué Delegación ve a cada
// matriculado. Match exacto nada más, ya que "subzona" también contiene "zona".
function getZona(row: Record<string, string>): string | null {
    const r = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeKey(k), v]));
    const v = r["zona (adic.)"] || r["zona"] || "";
    return v.trim() || null;
}

function getSubzona(row: Record<string, string>): string | null {
    const r = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeKey(k), v]));
    const v = r["subzona (adic.)"] || r["subzona"] || "";
    return v.trim() || null;
}

export type ResultadoImportDeudas =
    | { ok: true; actualizados: number; comprobantes: number }
    | { ok: false; error: string };

// Reemplazo total (no incremental): borra todas las deudas vigentes y las vuelve a
// cargar desde el archivo — mismo comportamiento sea manual o automático, a propósito
// (así lo pidió el Colegio: el archivo del mes es la fuente de verdad completa).
export async function procesarRegistrosDeudas(registros: Record<string, string>[]): Promise<ResultadoImportDeudas> {
    const filas = registros.map((r, index) => {
        const comprobante = {
            expediente: getExpediente(r),
            monto: getMonto(r),
            fechaVencimiento: getFechaVencimiento(r),
            clienteNumero: getClienteNumero(r),
            zona: getZona(r),
            subzona: getSubzona(r),
        };
        const errores: string[] = [];
        if (!comprobante.expediente) errores.push("sin expediente");
        if (!Number.isFinite(comprobante.monto) || comprobante.monto <= 0) errores.push("importe inválido");
        if (!comprobante.fechaVencimiento) errores.push("fecha de vencimiento inválida");
        return { index: index + 2, comprobante, errores };
    });

    const invalidas = filas.filter(f => f.errores.length > 0);
    if (invalidas.length > 0) {
        const muestra = invalidas.slice(0, 5).map(f => `fila ${f.index}: ${f.errores.join(", ")}`).join("; ");
        return {
            ok: false,
            error: `${invalidas.length} de ${registros.length} filas son inválidas (${muestra}${invalidas.length > 5 ? "; ..." : ""}). No se modificó ninguna deuda.`,
        };
    }

    const comprobantes = filas.map(f => f.comprobante).filter(
        (c): c is { expediente: string; monto: number; fechaVencimiento: Date; clienteNumero: string | null; zona: string | null; subzona: string | null } =>
            c.fechaVencimiento !== null
    );

    if (comprobantes.length === 0) return { ok: false, error: "Sin registros válidos" };

    const totales = new Map<string, number>();
    for (const c of comprobantes) totales.set(c.expediente, (totales.get(c.expediente) ?? 0) + c.monto);
    const data = [...totales.entries()].map(([expediente, monto]) => ({ expediente, monto }));

    // Zona/subzona por expediente (última fila vista gana) — se guarda en Dato para
    // que sobreviva aunque el expediente salde su deuda y desaparezca del próximo import.
    const zonaPorExpediente = new Map<string, { zona: string | null; subzona: string | null }>();
    for (const c of comprobantes) {
        if (c.zona || c.subzona) zonaPorExpediente.set(c.expediente, { zona: c.zona, subzona: c.subzona });
    }

    // El advisory lock serializa tanto el watcher FTP como la importación manual.
    // Zona/subzona quedan dentro de la misma transacción que el reemplazo financiero.
    await prisma.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(7346, 20260924)`;
        await tx.deuda.deleteMany({});
        await tx.deuda.createMany({ data });
        await tx.deudaComprobante.deleteMany({});
        await tx.deudaComprobante.createMany({ data: comprobantes });
        for (const [expediente, z] of zonaPorExpediente) {
            await tx.dato.updateMany({ where: { expediente }, data: { zona: z.zona, subzona: z.subzona } });
        }
    }, { maxWait: 30_000, timeout: 120_000 });

    return { ok: true, actualizados: data.length, comprobantes: comprobantes.length };
}
