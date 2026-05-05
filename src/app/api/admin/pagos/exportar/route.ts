import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function parseMes(mes: string | null): { desde: Date; hasta: Date } | null {
    if (!mes) return null;
    const [y, m] = mes.split("-").map(Number);
    if (!y || !m) return null;
    return { desde: new Date(y, m - 1, 1), hasta: new Date(y, m, 1) };
}

async function getCodsMap(expedientes: string[]): Promise<Map<string, string>> {
    const datos = await prisma.dato.findMany({
        where: { expediente: { in: expedientes } },
        select: { expediente: true, cod: true },
    });
    const map = new Map<string, string>();
    for (const d of datos) {
        if (d.expediente) map.set(d.expediente, d.cod);
    }
    return map;
}

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || (session.accessLevel !== "admin" && session.accessLevel !== "superadmin")) {
        return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo"); // "deudas" | "cuotas_mp" | "todos"
    const mes = searchParams.get("mes");
    const soloNoExportados = searchParams.get("soloNoExportados") === "true";

    const rango = parseMes(mes);

    const metodoPago = searchParams.get("metodoPago"); // null | "mercadopago" | "banelco" | "transferencia" | "home_banking"

    const incluirDeudas = tipo === "deudas" || tipo === "todos";
    const incluirCuotas = tipo === "cuotas" || tipo === "todos";

    const [deudas, cuotas] = await Promise.all([
        incluirDeudas
            ? prisma.deudaPagada.findMany({
                where: {
                    ...(soloNoExportados ? { exportado: false } : {}),
                    ...(rango ? { fechaPago: { gte: rango.desde, lt: rango.hasta } } : {}),
                    ...(metodoPago ? { metodoPago } : {}),
                },
                orderBy: { fechaPago: "desc" },
            })
            : [],
        incluirCuotas
            ? prisma.cuotaMensual.findMany({
                where: {
                    estado: "pagado",
                    ...(soloNoExportados ? { exportado: false } : {}),
                    ...(mes ? { periodo: mes } : {}),
                    ...(metodoPago ? { metodoPago } : {}),
                },
                orderBy: { fechaPago: "desc" },
            })
            : [],
    ]);

    const allExpedientes = [
        ...deudas.map((d) => d.expediente),
        ...cuotas.map((c) => c.expediente),
    ];
    const codsMap = await getCodsMap([...new Set(allExpedientes)]);

    const filasDeudas = deudas.map((r) => ({
        id: r.id,
        tipo: "deuda" as const,
        metodoPago: r.metodoPago,
        exportado: r.exportado,
        nroRecibo: r.mpPaymentId ?? "",
        cliente: codsMap.get(r.expediente) ?? r.expediente,
        fechaCobro: r.fechaPago,
        importe: r.monto,
    }));

    const filasCuotas = cuotas.map((r) => ({
        id: r.id,
        tipo: "cuota_mp" as const,
        metodoPago: r.metodoPago ?? "",
        exportado: r.exportado,
        nroRecibo: r.mpPaymentId ?? "",
        cliente: codsMap.get(r.expediente) ?? r.expediente,
        fechaCobro: r.fechaPago,
        importe: r.monto,
    }));

    // Unificar y ordenar por fecha desc
    const filas = [...filasDeudas, ...filasCuotas].sort((a, b) => {
        const ta = a.fechaCobro ? new Date(a.fechaCobro).getTime() : 0;
        const tb = b.fechaCobro ? new Date(b.fechaCobro).getTime() : 0;
        return tb - ta;
    });

    return NextResponse.json({ filas });
}

// POST — marcar como exportados (recibe array mixto { tipo, id }[])
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || (session.accessLevel !== "admin" && session.accessLevel !== "superadmin")) {
        return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const { items } = await req.json() as { items: { tipo: string; id: number }[] };
    if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const idsDeuda = items.filter((i) => i.tipo === "deuda").map((i) => i.id);
    const idsCuota = items.filter((i) => i.tipo === "cuota_mp").map((i) => i.id);

    await Promise.all([
        idsDeuda.length > 0
            ? prisma.deudaPagada.updateMany({ where: { id: { in: idsDeuda } }, data: { exportado: true } })
            : Promise.resolve(),
        idsCuota.length > 0
            ? prisma.cuotaMensual.updateMany({ where: { id: { in: idsCuota } }, data: { exportado: true } })
            : Promise.resolve(),
    ]);

    return NextResponse.json({ ok: true });
}
