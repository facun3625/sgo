import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMpClients, decodeRef } from "@/lib/mercadopago";
import { crearNotificacion } from "@/lib/notificaciones";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // MP envía distintos tipos de notificaciones — solo nos interesan los pagos
        if (body.type !== "payment") {
            return NextResponse.json({ ok: true });
        }

        const paymentId = body.data?.id;
        if (!paymentId) return NextResponse.json({ ok: true });

        // Obtener detalle del pago desde la API de MP
        const { payment: mpPayment } = await getMpClients();
        const payment = await mpPayment.get({ id: paymentId });

        if (payment.status !== "approved") {
            // Pendiente o rechazado — nada que hacer por ahora
            return NextResponse.json({ ok: true });
        }

        const raw = payment.external_reference;
        if (!raw) return NextResponse.json({ ok: true });

        const { tipo, expediente, ref, extra } = decodeRef(raw);

        // ── Procesar según tipo ──────────────────────────────────────────────
        if (tipo === "matricula_mensual") {
            const cuota = await prisma.cuotaMensual.findUnique({ where: { id: parseInt(ref) } });
            if (cuota && cuota.estado !== "pagado") {
                await prisma.cuotaMensual.update({
                    where: { id: cuota.id },
                    data: { estado: "pagado" },
                });
                await crearNotificacion(
                    expediente,
                    "Pago de cuota confirmado",
                    `Tu pago de la cuota ${cuota.periodo} fue acreditado correctamente.`,
                    "pago"
                );
            }

        } else if (tipo === "matricula_anual") {
            const existente = await prisma.pagoAnual.findFirst({ where: { expediente } });
            if (!existente) {
                await prisma.pagoAnual.create({ data: { expediente } });
                await crearNotificacion(
                    expediente,
                    "Matrícula anual confirmada",
                    "Tu pago de matrícula anual fue acreditado. ¡Gracias!",
                    "pago"
                );
            }

        } else if (tipo === "curso") {
            const inscripcion = await prisma.inscripcionCurso.findUnique({
                where: { id: parseInt(ref) },
                include: { opcion: true, curso: true },
            });
            if (inscripcion && inscripcion.estado !== "confirmada") {
                await prisma.inscripcionCurso.update({
                    where: { id: inscripcion.id },
                    data: { estado: "confirmada", metodoPago: "mercadopago" },
                });
                // Incrementar inscritos en la opción
                if (inscripcion.opcionId) {
                    await prisma.cursoOpcion.update({
                        where: { id: inscripcion.opcionId },
                        data: { inscritos: { increment: 1 } },
                    });
                }
                await crearNotificacion(
                    expediente,
                    "Inscripción confirmada",
                    `Tu inscripción al curso "${inscripcion.curso.titulo}" fue confirmada.`,
                    "curso"
                );
            }

        } else if (tipo === "deuda") {
            const ids = ref.split(",").map((id) => parseInt(id)).filter((id) => !isNaN(id));
            if (ids.length > 0) {
                await prisma.deuda.deleteMany({ where: { id: { in: ids }, expediente } });
                await crearNotificacion(
                    expediente,
                    "Deuda saldada",
                    "Tu pago fue acreditado y la deuda ha sido cancelada. ¡Gracias!",
                    "pago"
                );
            }

        } else if (tipo === "producto") {
            const productoId = parseInt(ref);
            const cantidad = parseInt(extra ?? "1");

            const producto = await prisma.producto.findUnique({ where: { id: productoId } });
            if (producto) {
                await prisma.$transaction([
                    prisma.pedido.create({
                        data: {
                            expediente,
                            productoId,
                            cantidad,
                            metodoPago: "mercadopago",
                            estado: "aprobado",
                        },
                    }),
                    prisma.producto.update({
                        where: { id: productoId },
                        data: { stock: { decrement: cantidad } },
                    }),
                ]);
                await crearNotificacion(
                    expediente,
                    "Pedido confirmado",
                    `Tu compra de "${producto.nombre}" (x${cantidad}) fue confirmada. Ya podés retirarlo.`,
                    "pedido"
                );
            }
        }

        return NextResponse.json({ ok: true });

    } catch (err) {
        console.error("[MP webhook]", err);
        // Devolver 200 igual para que MP no reintente indefinidamente
        return NextResponse.json({ ok: true });
    }
}
