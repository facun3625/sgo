import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

type TipoFinanciero = "deudas" | "pagoAnual" | "consultor";

function normalizeKey(k: string) {
    return k.toLowerCase().trim().replace(/\s*\(\d+\)$/, "");
}

function getExpediente(row: Record<string, string>): string {
    const r = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeKey(k), v]));
    // Búsqueda exacta primero
    const exacta = r["expediente"] || r["usuario_sistema"] || r["usuario"] || r["exp"] || r["nro"] || r["numero"] || "";
    if (exacta.trim()) return exacta.trim();
    // Fallback: cualquier clave que contenga "expediente"
    const partial = Object.entries(r).find(([k]) => k.includes("expediente"));
    return (partial?.[1] ?? "").trim();
}

function getMonto(row: Record<string, string>): number {
    const r = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeKey(k), v]));
    const exacta = r["monto"] || r["importe"] || r["deuda"] || r["valor"] || r["total"] || r["saldo"] || "";
    if (exacta.trim()) return parseFloat(String(exacta).replace(",", "."));
    // Fallback: cualquier clave que contenga "importe" o "monto" (ej. "Importe Pendiente (CTE)")
    const partial = Object.entries(r).find(([k]) => k.includes("importe") || k.includes("monto"));
    return parseFloat(String(partial?.[1] ?? "").replace(",", "."));
}

// Excel de "Cuenta Corriente - Deudas vencidas": trae una fila por comprobante impago
// (fecha de vencimiento, tipo, nro, cliente, importe, expediente...) — llegan como
// strings "dd/mm/yyyy" porque el cliente (parseExcel) ya convirtió los seriales de
// Excel a fecha real antes de mandar los registros acá.
function getFechaVencimiento(row: Record<string, string>): Date | null {
    const r = Object.fromEntries(Object.entries(row).map(([k, v]) => [normalizeKey(k), v]));
    const raw = r["fecha de vencimiento"] || r["fecha_vencimiento"] || r["vencimiento"] || "";
    const partial = raw.trim() ? raw : (Object.entries(r).find(([k]) => k.includes("vencimiento"))?.[1] ?? "");
    const m = String(partial).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const [, d, mo, y] = m;
    const fecha = new Date(Date.UTC(+y, +mo - 1, +d));
    return isNaN(fecha.getTime()) ? null : fecha;
}

// La columna "Cliente" viene como "12009 - APELLIDO, NOMBRE" — el número inicial es
// el código de cliente interno de ellos, distinto del expediente. Se guarda por si
// hace falta cruzar con algo más adelante, no se usa todavía para nada funcional.
function getClienteNumero(row: Record<string, string>): string | null {
    const cliente = row["cliente"] ?? "";
    const m = String(cliente).match(/^(\d+)\s*-\s*/);
    return m ? m[1] : null;
}

// "ZONA (Adic.)" / "SUBZONA (Adic.)" — determinan qué Dependencia ve a cada
// matriculado. Match exacto nada más (no fuzzy) para no confundir zona con
// subzona, ya que "subzona" también contiene la palabra "zona".
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

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { tipo, registros }: { tipo: TipoFinanciero; registros: Record<string, string>[] } = await req.json();

    if (!tipo || !Array.isArray(registros) || registros.length === 0)
        return NextResponse.json({ error: "Tipo o registros inválidos" }, { status: 400 });

    const tiposValidos: TipoFinanciero[] = ["deudas", "pagoAnual", "consultor"];
    if (!tiposValidos.includes(tipo))
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });

    if (tipo === "deudas") {
        const comprobantes = registros
            .map(r => ({
                expediente: getExpediente(r),
                monto: getMonto(r),
                fechaVencimiento: getFechaVencimiento(r),
                clienteNumero: getClienteNumero(r),
                zona: getZona(r),
                subzona: getSubzona(r),
            }))
            .filter((c): c is { expediente: string; monto: number; fechaVencimiento: Date; clienteNumero: string | null; zona: string | null; subzona: string | null } =>
                !!c.expediente && !isNaN(c.monto) && c.monto > 0 && c.fechaVencimiento !== null);
        if (comprobantes.length === 0) return NextResponse.json({ error: "Sin registros válidos" }, { status: 400 });

        const totales = new Map<string, number>();
        for (const c of comprobantes) totales.set(c.expediente, (totales.get(c.expediente) ?? 0) + c.monto);
        const data = [...totales.entries()].map(([expediente, monto]) => ({ expediente, monto }));

        // Zona/subzona por expediente (última fila vista gana) — se guarda en
        // Dato para que sobreviva aunque el expediente salde su deuda y
        // desaparezca del próximo import.
        const zonaPorExpediente = new Map<string, { zona: string | null; subzona: string | null }>();
        for (const c of comprobantes) {
            if (c.zona || c.subzona) zonaPorExpediente.set(c.expediente, { zona: c.zona, subzona: c.subzona });
        }

        await prisma.$transaction([
            prisma.deuda.deleteMany({}),
            prisma.deuda.createMany({ data }),
            prisma.deudaComprobante.deleteMany({}),
            prisma.deudaComprobante.createMany({ data: comprobantes }),
        ]);

        await Promise.all(
            [...zonaPorExpediente.entries()].map(([expediente, z]) =>
                prisma.dato.updateMany({ where: { expediente }, data: { zona: z.zona, subzona: z.subzona } })
            )
        );

        return NextResponse.json({ actualizados: data.length, comprobantes: comprobantes.length });
    }

    if (tipo === "pagoAnual") {
        const expedientes = registros.map(r => getExpediente(r)).filter(Boolean);
        if (expedientes.length === 0) return NextResponse.json({ error: "Sin expedientes válidos" }, { status: 400 });
        await prisma.pagoAnual.deleteMany({});
        await prisma.pagoAnual.createMany({ data: expedientes.map(e => ({ expediente: e })) });
        return NextResponse.json({ actualizados: expedientes.length });
    }

    if (tipo === "consultor") {
        const expedientes = registros.map(r => getExpediente(r)).filter(Boolean);
        if (expedientes.length === 0) return NextResponse.json({ error: "Sin expedientes válidos" }, { status: 400 });
        await prisma.dato.updateMany({ where: { tipo: "consultor" }, data: { tipo: null } });
        const res = await prisma.dato.updateMany({ where: { expediente: { in: expedientes } }, data: { tipo: "consultor" } });
        return NextResponse.json({ actualizados: res.count });
    }

    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
}
