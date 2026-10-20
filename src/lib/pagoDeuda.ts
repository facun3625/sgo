import prisma from "@/lib/prisma";

// Pago parcial de deuda: la unidad de pago es el comprobante individual
// (DeudaComprobante), no el total agregado de Deuda — el matriculado elige
// cuáles de sus comprobantes vencidos quiere pagar. Deuda.monto sigue siendo
// la suma de lo que queda pendiente; se recalcula acá en vez de en el import,
// así que hay que mantenerlo sincronizado a mano en cada pago.

export interface ComprobanteDeuda {
    id: number;
    monto: number;
    fechaVencimiento: Date;
}

export function parseIdsDeuda(ref: string): number[] {
    return String(ref).split(",").map(id => parseInt(id)).filter(id => !isNaN(id));
}

// Trae y valida los comprobantes elegidos — solo los que existen y pertenecen
// al expediente (cualquier id ajeno o inexistente queda afuera en silencio,
// mismo criterio que ya usaba el pago de deuda por Deuda.id).
export async function obtenerComprobantesDeuda(expediente: string, ids: number[]): Promise<ComprobanteDeuda[]> {
    if (ids.length === 0) return [];
    return prisma.deudaComprobante.findMany({
        where: { id: { in: ids }, expediente },
        select: { id: true, monto: true, fechaVencimiento: true },
    });
}

export async function calcularMontoComprobantes(expediente: string, ids: number[]): Promise<{ comprobantes: ComprobanteDeuda[]; monto: number }> {
    const comprobantes = await obtenerComprobantesDeuda(expediente, ids);
    return { comprobantes, monto: comprobantes.reduce((acc, c) => acc + c.monto, 0) };
}

// Confirma el pago de los comprobantes elegidos: crea el DeudaPagada por el
// monto exacto recalculado server-side (nunca se confía en lo que mandó el
// cliente), borra esos comprobantes (ya están saldados) y descuenta el total
// de Deuda.monto del expediente — si el saldo restante queda en ~0 (umbral
// por redondeo de floats), borra la fila de Deuda en vez de dejarla en 0.
export async function confirmarPagoComprobantes(
    expediente: string,
    ids: number[],
    datosPago: { metodoPago: string; mpPaymentId?: string; paywayPaymentId?: string },
): Promise<{ monto: number; cantidad: number } | null> {
    const comprobantes = await obtenerComprobantesDeuda(expediente, ids);
    if (comprobantes.length === 0) return null;
    const monto = comprobantes.reduce((acc, c) => acc + c.monto, 0);

    await prisma.$transaction(async tx => {
        await tx.deudaPagada.create({
            data: {
                expediente, monto, metodoPago: datosPago.metodoPago,
                mpPaymentId: datosPago.mpPaymentId, paywayPaymentId: datosPago.paywayPaymentId,
                fechaPago: new Date(),
            },
        });
        await tx.deudaComprobante.deleteMany({ where: { id: { in: comprobantes.map(c => c.id) } } });

        const deuda = await tx.deuda.findFirst({ where: { expediente } });
        if (deuda) {
            const restante = deuda.monto - monto;
            if (restante <= 0.01) {
                await tx.deuda.delete({ where: { id: deuda.id } });
            } else {
                await tx.deuda.update({ where: { id: deuda.id }, data: { monto: restante } });
            }
        }
    });

    return { monto, cantidad: comprobantes.length };
}
