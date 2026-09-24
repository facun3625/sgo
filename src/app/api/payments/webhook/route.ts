import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMpClients, decodeRef } from "@/lib/mercadopago";
import { crearNotificacion } from "@/lib/notificaciones";
import { enviarInscripcionCursoConfirmada } from "@/lib/mailer";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        if (body.type !== "payment") {
            return NextResponse.json({ ok: true });
        }

        const paymentId = body.data?.id;
        if (!paymentId) return NextResponse.json({ ok: true });

        const { payment: mpPayment } = await getMpClients();
        const payment = await mpPayment.get({ id: paymentId });

        const raw = payment.external_reference;
        if (!raw) return NextResponse.json({ ok: true });

        const { tipo, expediente, ref, extra } = decodeRef(raw);
        const mpPaymentId = String(paymentId);
        const fechaPago = new Date();

        // Pago rechazado o cancelado: para inscripciones a cursos, marcarlas como
        // "rechazada" en vez de dejarlas colgadas en "pendiente_pago". (Los estados
        // "in_process"/"pending" siguen su curso, no se tocan.)
        if (payment.status === "rejected" || payment.status === "cancelled") {
            if (tipo === "curso") {
                const insc = await prisma.inscripcionCurso.findUnique({ where: { id: parseInt(ref) } });
                if (insc && insc.estado === "pendiente_pago") {
                    await prisma.inscripcionCurso.update({
                        where: { id: insc.id },
                        data: { estado: "rechazada" },
                    });
                }
            }
            return NextResponse.json({ ok: true });
        }

        if (payment.status !== "approved") {
            return NextResponse.json({ ok: true });
        }

        if (tipo === "matricula_mensual") {
            const cuota = await prisma.cuotaMensual.findUnique({ where: { id: parseInt(ref) } });
            if (cuota && cuota.estado !== "pagado") {
                await prisma.cuotaMensual.update({
                    where: { id: cuota.id },
                    data: { estado: "pagado", metodoPago: "mercadopago", mpPaymentId, fechaPago },
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
                await prisma.pagoAnual.create({ data: { expediente, mpPaymentId, fechaPago } });
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
                    data: { estado: "confirmada", metodoPago: "mercadopago", mpPaymentId, fechaPago },
                });
                if (inscripcion.opcionId) {
                    await prisma.cursoOpcion.update({
                        where: { id: inscripcion.opcionId },
                        data: { inscritos: { increment: 1 } },
                    });
                }
                if (inscripcion.esInvitado && inscripcion.guestEmail) {
                    await enviarInscripcionCursoConfirmada(inscripcion.guestEmail, inscripcion.curso.titulo, inscripcion.opcion?.infoPrivada).catch(err => console.error("[mailer] error enviando confirmación a invitado:", err));
                } else {
                    await crearNotificacion(
                        expediente,
                        "Inscripción confirmada",
                        `Tu inscripción al curso "${inscripcion.curso.titulo}" fue confirmada.`,
                        "curso"
                    );
                }
            }

        } else if (tipo === "deuda") {
            const ids = ref.split(",").map((id) => parseInt(id)).filter((id) => !isNaN(id));
            if (ids.length > 0) {
                const deudas = await prisma.deuda.findMany({ where: { id: { in: ids }, expediente } });
                const montoTotal = deudas.reduce((acc, d) => acc + d.monto, 0);

                await prisma.$transaction([
                    prisma.deudaPagada.create({
                        data: { expediente, monto: montoTotal, mpPaymentId, metodoPago: "mercadopago", fechaPago },
                    }),
                    prisma.deuda.deleteMany({ where: { id: { in: ids }, expediente } }),
                ]);
                await crearNotificacion(
                    expediente,
                    "Deuda saldada",
                    "Tu pago fue acreditado y la deuda ha sido cancelada. ¡Gracias!",
                    "pago"
                );
            }

        } else if (tipo === "rehab_costo") {
            const solicitudId = parseInt(ref);
            const solicitud = await prisma.solicitudRehabilitacion.findUnique({ where: { id: solicitudId } });
            if (solicitud && solicitud.estado === "borrador" && !solicitud.p5Ok) {
                await prisma.solicitudRehabilitacion.update({
                    where: { id: solicitudId },
                    data: { p5MpPaymentId: mpPaymentId, p5Metodo: "mercadopago", p5Ok: true, estado: "pendiente" },
                });
                await crearNotificacion(
                    expediente,
                    "Pago de rehabilitación confirmado",
                    "Tu pago fue acreditado. Tu solicitud de rehabilitación está en revisión.",
                    "general"
                );
                // Notificar admins
                const admins = await prisma.user.findMany({
                    where: { accessLevel: { in: ["admin", "superadmin"] } },
                    select: { expediente: true },
                });
                const dato = await prisma.dato.findFirst({ where: { expediente }, select: { nombre: true, apellido: true } });
                const nombre = dato ? `${dato.apellido}, ${dato.nombre}` : `Mat. ${expediente}`;
                await prisma.notificacion.createMany({
                    data: admins.filter(a => a.expediente).map(a => ({
                        expediente: a.expediente!,
                        titulo: "Nueva solicitud de rehabilitación",
                        mensaje: `${nombre} completó el trámite y solicita rehabilitación de matrícula.`,
                        tipo: "general",
                    })),
                });
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
                            mpPaymentId,
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
        return NextResponse.json({ ok: true });
    }
}
