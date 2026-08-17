import prisma from "@/lib/prisma";

// null (sin parámetro "mes" o "todos") = sin filtro, trae todo el historial.
export function rangoMes(mes: string | null): { desde: Date; hasta: Date } | undefined {
    if (!mes || mes === "todos") return undefined;
    const [y, m] = mes.split("-").map(Number);
    if (!y || !m) return undefined;
    return { desde: new Date(y, m - 1, 1), hasta: new Date(y, m, 1) };
}

export type CobroFila = {
    tipo: "cuota_mensual" | "matricula_anual" | "deuda";
    expediente: string;
    nombre: string;
    apellido: string;
    monto: number;
    fecha: Date | null;
    comprobante: string | null;
};

// Historial de cobros en efectivo de una dependencia — usado tanto por la ficha
// de administración (todo el historial) como por la pantalla propia del
// cobrador (filtrado por mes).
export async function obtenerCobrosDependencia(
    dependenciaId: number,
    rango?: { desde: Date; hasta: Date }
): Promise<{ cobros: CobroFila[]; totalCobrado: number }> {
    const fechaPagoFilter = rango ? { fechaPago: { gte: rango.desde, lt: rango.hasta } } : {};

    const [cuotas, deudas, anuales] = await Promise.all([
        prisma.cuotaMensual.findMany({ where: { dependenciaId, ...fechaPagoFilter }, orderBy: { fechaPago: "desc" } }),
        prisma.deudaPagada.findMany({ where: { dependenciaId, ...fechaPagoFilter }, orderBy: { fechaPago: "desc" } }),
        prisma.pagoAnual.findMany({ where: { dependenciaId, ...fechaPagoFilter }, orderBy: { fechaPago: "desc" } }),
    ]);

    const expedientes = [...new Set([...cuotas, ...deudas, ...anuales].map((r) => r.expediente))];
    const datos = expedientes.length > 0
        ? await prisma.dato.findMany({ where: { expediente: { in: expedientes } }, select: { expediente: true, nombre: true, apellido: true } })
        : [];
    const datosMap = new Map(datos.map((d) => [d.expediente, d]));

    const cobros: CobroFila[] = [
        ...cuotas.map((c) => ({
            tipo: "cuota_mensual" as const, expediente: c.expediente,
            nombre: datosMap.get(c.expediente)?.nombre ?? "", apellido: datosMap.get(c.expediente)?.apellido ?? "",
            monto: c.monto, fecha: c.fechaPago, comprobante: c.comprobanteEfectivo,
        })),
        ...deudas.map((d) => ({
            tipo: "deuda" as const, expediente: d.expediente,
            nombre: datosMap.get(d.expediente)?.nombre ?? "", apellido: datosMap.get(d.expediente)?.apellido ?? "",
            monto: d.monto, fecha: d.fechaPago, comprobante: d.comprobanteEfectivo,
        })),
        ...anuales.map((a) => ({
            tipo: "matricula_anual" as const, expediente: a.expediente,
            nombre: datosMap.get(a.expediente)?.nombre ?? "", apellido: datosMap.get(a.expediente)?.apellido ?? "",
            monto: a.monto ?? 0, fecha: a.fechaPago, comprobante: a.comprobanteEfectivo,
        })),
    ].sort((a, b) => (b.fecha ? new Date(b.fecha).getTime() : 0) - (a.fecha ? new Date(a.fecha).getTime() : 0));

    return { cobros, totalCobrado: cobros.reduce((acc, c) => acc + c.monto, 0) };
}
