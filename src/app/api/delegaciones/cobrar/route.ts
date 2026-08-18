import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { esMatriculadoJoven, montoConDescuento } from "@/lib/matricula";
import { crearNotificacion } from "@/lib/notificaciones";

// Cobro en efectivo registrado por una cuenta de Delegación (mismo cálculo de
// precio que /api/payments/payway, pero acá el "pago" es la palabra del cobrador
// — no hay pasarela. Cada movimiento queda atado a la delegación que lo cobró.
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !session.delegacionId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const delegacionId = session.delegacionId;

    const { expediente, tipo, comprobante } = await req.json();
    if (!expediente || !tipo) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const dato = await prisma.dato.findFirst({ where: { expediente } });
    if (!dato) return NextResponse.json({ error: "Matriculado no encontrado" }, { status: 404 });

    const comprobanteEfectivo = comprobante?.trim() || null;
    const fechaPago = new Date();

    if (tipo === "cuota_mensual") {
        const currentPeriod = new Date().toISOString().slice(0, 7);
        const cuota = await prisma.cuotaMensual.findFirst({ where: { expediente, periodo: currentPeriod } });
        if (!cuota) return NextResponse.json({ error: "No hay cuota del mes generada para este expediente" }, { status: 404 });
        if (cuota.estado === "pagado") return NextResponse.json({ error: "Esta cuota ya fue abonada" }, { status: 400 });

        await prisma.cuotaMensual.update({
            where: { id: cuota.id },
            data: { estado: "pagado", metodoPago: "efectivo", fechaPago, delegacionId, comprobanteEfectivo },
        });
        await crearNotificacion(expediente, "Pago de cuota confirmado", "Tu pago de la cuota fue registrado en delegación.", "pago");
        return NextResponse.json({ ok: true, monto: cuota.monto });

    } else if (tipo === "matricula_anual") {
        const [config, existente] = await Promise.all([
            prisma.config.findUnique({ where: { clave: "montoAnual" } }),
            prisma.pagoAnual.findFirst({ where: { expediente } }),
        ]);
        if (existente) return NextResponse.json({ error: "Ya tiene el pago anual registrado" }, { status: 400 });

        const montoBase = config ? parseFloat(config.valor) : 48000;
        const monto = montoConDescuento(montoBase, esMatriculadoJoven(dato.fechaMatriculacion));

        await prisma.pagoAnual.create({
            data: { expediente, monto, metodoPago: "efectivo", fechaPago, delegacionId, comprobanteEfectivo },
        });
        await crearNotificacion(expediente, "Matrícula anual confirmada", "Tu pago de matrícula anual fue registrado en delegación. ¡Gracias!", "pago");
        return NextResponse.json({ ok: true, monto });

    } else if (tipo === "deuda") {
        const deudas = await prisma.deuda.findMany({ where: { expediente } });
        if (deudas.length === 0) return NextResponse.json({ error: "No tiene deuda registrada" }, { status: 404 });
        const monto = deudas.reduce((acc, d) => acc + d.monto, 0);

        await prisma.$transaction([
            prisma.deudaPagada.create({
                data: { expediente, monto, metodoPago: "efectivo", fechaPago, delegacionId, comprobanteEfectivo },
            }),
            prisma.deuda.deleteMany({ where: { expediente } }),
        ]);
        await crearNotificacion(expediente, "Deuda regularizada", "Tu pago de deuda vencida fue registrado en delegación.", "pago");
        return NextResponse.json({ ok: true, monto });
    }

    return NextResponse.json({ error: "Tipo de pago inválido" }, { status: 400 });
}
