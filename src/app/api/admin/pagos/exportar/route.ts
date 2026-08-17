import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function parseMes(mes: string | null): { desde: Date; hasta: Date } | null {
    if (!mes) return null;
    const [y, m] = mes.split("-").map(Number);
    if (!y || !m) return null;
    return { desde: new Date(y, m - 1, 1), hasta: new Date(y, m, 1) };
}

type DatoInfo = { cod: string; nombre: string; apellido: string };
async function getDatosMap(expedientes: string[]): Promise<Map<string, DatoInfo>> {
    const datos = await prisma.dato.findMany({
        where: { expediente: { in: expedientes } },
        select: { expediente: true, cod: true, nombre: true, apellido: true },
    });
    const map = new Map<string, DatoInfo>();
    for (const d of datos) {
        if (d.expediente) map.set(d.expediente, { cod: d.cod, nombre: d.nombre ?? "", apellido: d.apellido ?? "" });
    }
    return map;
}

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || (session.accessLevel !== "admin" && session.accessLevel !== "superadmin")) {
        return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo"); // "deudas" | "cuotas" | "anual" | "todos"
    const mes = searchParams.get("mes");
    const soloNoExportados = searchParams.get("soloNoExportados") === "true";

    const rango = parseMes(mes);

    const metodoPago = searchParams.get("metodoPago"); // null | "mercadopago" | "banelco" | "transferencia" | "home_banking" | "efectivo"

    const incluirDeudas = tipo === "deudas" || tipo === "todos";
    const incluirCuotas = tipo === "cuotas" || tipo === "todos";
    const incluirAnual = tipo === "anual" || tipo === "todos";

    const [deudas, cuotas, anuales] = await Promise.all([
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
                    metodoPago: { not: "matriculacion" },
                    ...(soloNoExportados ? { exportado: false } : {}),
                    ...(mes ? { periodo: mes } : {}),
                    ...(metodoPago ? { metodoPago } : {}),
                },
                orderBy: { fechaPago: "desc" },
            })
            : [],
        incluirAnual
            ? prisma.pagoAnual.findMany({
                where: {
                    fechaPago: { not: null },
                    ...(soloNoExportados ? { exportado: false } : {}),
                    ...(rango ? { fechaPago: { gte: rango.desde, lt: rango.hasta } } : {}),
                    ...(metodoPago ? { metodoPago } : {}),
                },
                orderBy: { fechaPago: "desc" },
            })
            : [],
    ]);

    const allExpedientes = [
        ...deudas.map((d) => d.expediente),
        ...cuotas.map((c) => c.expediente),
        ...anuales.map((a) => a.expediente),
    ];
    const datosMap = await getDatosMap([...new Set(allExpedientes)]);

    const allDependenciaIds = [...new Set(
        [...deudas, ...cuotas, ...anuales].map((r) => r.dependenciaId).filter((id): id is number => id != null)
    )];
    const dependencias = allDependenciaIds.length > 0
        ? await prisma.dependencia.findMany({ where: { id: { in: allDependenciaIds } }, select: { id: true, nombre: true } })
        : [];
    const dependenciaMap = new Map(dependencias.map((d) => [d.id, d.nombre]));

    // Construir map de comprobantes: "cod:tipo" → factura
    const allCods = [...new Set(
        [...deudas, ...cuotas, ...anuales].map((r) => datosMap.get(r.expediente)?.cod ?? r.expediente).filter(Boolean)
    )];
    const boletas = allCods.length > 0
        ? await prisma.facturaSantaFe.findMany({
            where: { cod: { in: allCods } },
            select: { cod: true, tipo: true, factura: true },
        })
        : [];
    // Si hay múltiples boletas del mismo cod+tipo, tomamos la primera (lote activo)
    const boletaMap = new Map<string, string>();
    for (const b of boletas) {
        const key = `${b.cod}:${b.tipo}`;
        if (!boletaMap.has(key) && b.factura) boletaMap.set(key, b.factura);
    }

    const filasDeudas = deudas.map((r) => {
        const dato = datosMap.get(r.expediente);
        const cod = dato?.cod ?? r.expediente;
        return {
            id: r.id,
            tipo: "deuda" as const,
            metodoPago: r.metodoPago,
            exportado: r.exportado,
            nroRecibo: r.metodoPago === "efectivo" ? (r.comprobanteEfectivo || "") : (r.mpPaymentId ?? ""),
            expediente: r.expediente,
            cliente: cod,
            nombre: dato?.nombre ?? "",
            apellido: dato?.apellido ?? "",
            fechaCobro: r.fechaPago,
            importe: r.monto,
            nroComprobante: boletaMap.get(`${cod}:deuda`) ?? "",
            dependencia: r.dependenciaId ? (dependenciaMap.get(r.dependenciaId) ?? "") : "",
        };
    });

    const filasCuotas = cuotas.map((r) => {
        const dato = datosMap.get(r.expediente);
        const cod = dato?.cod ?? r.expediente;
        return {
            id: r.id,
            tipo: "cuota_mp" as const,
            metodoPago: r.metodoPago ?? "",
            exportado: r.exportado,
            nroRecibo: r.metodoPago === "matriculacion" ? "Exento - Joven Abogado" : r.metodoPago === "efectivo" ? (r.comprobanteEfectivo || "") : (r.mpPaymentId ?? ""),
            expediente: r.expediente,
            cliente: cod,
            nombre: dato?.nombre ?? "",
            apellido: dato?.apellido ?? "",
            fechaCobro: r.fechaPago,
            importe: r.monto,
            nroComprobante: boletaMap.get(`${cod}:mensual`) ?? "",
            dependencia: r.dependenciaId ? (dependenciaMap.get(r.dependenciaId) ?? "") : "",
        };
    });

    const filasAnuales = anuales.map((r) => {
        const dato = datosMap.get(r.expediente);
        const cod = dato?.cod ?? r.expediente;
        return {
            id: r.id,
            tipo: "anual" as const,
            metodoPago: r.metodoPago ?? "",
            exportado: r.exportado,
            nroRecibo: r.metodoPago === "efectivo" ? (r.comprobanteEfectivo || "") : (r.mpPaymentId ?? ""),
            expediente: r.expediente,
            cliente: cod,
            nombre: dato?.nombre ?? "",
            apellido: dato?.apellido ?? "",
            fechaCobro: r.fechaPago,
            importe: r.monto ?? 0,
            nroComprobante: boletaMap.get(`${cod}:anual`) ?? "",
            dependencia: r.dependenciaId ? (dependenciaMap.get(r.dependenciaId) ?? "") : "",
        };
    });

    // Unificar y ordenar por fecha desc
    const filas = [...filasDeudas, ...filasCuotas, ...filasAnuales].sort((a, b) => {
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
    const idsAnual = items.filter((i) => i.tipo === "anual").map((i) => i.id);

    await Promise.all([
        idsDeuda.length > 0
            ? prisma.deudaPagada.updateMany({ where: { id: { in: idsDeuda } }, data: { exportado: true } })
            : Promise.resolve(),
        idsCuota.length > 0
            ? prisma.cuotaMensual.updateMany({ where: { id: { in: idsCuota } }, data: { exportado: true } })
            : Promise.resolve(),
        idsAnual.length > 0
            ? prisma.pagoAnual.updateMany({ where: { id: { in: idsAnual } }, data: { exportado: true } })
            : Promise.resolve(),
    ]);

    return NextResponse.json({ ok: true });
}
