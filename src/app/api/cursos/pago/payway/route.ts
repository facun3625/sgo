import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { autorizarPagoPayway, marcaSoportadaPayway, paywayDisponibleParaSeccion } from "@/lib/payway";
import { enviarInscripcionCursoConfirmada } from "@/lib/mailer";

// Cobro con tarjeta (Payway) para inscripciones de invitados — sin sesión.
// A diferencia de MercadoPago, Payway confirma el pago en la misma respuesta
// (no hace falta webhook): tokenización en el navegador, cobro acá.
export async function POST(req: NextRequest) {
    const { inscripcionId, token, marca, bin, facturacion } = await req.json();
    if (!inscripcionId || !token || !marca || !bin || !facturacion) {
        return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }
    if (!marcaSoportadaPayway(marca)) {
        return NextResponse.json({ error: "Tarjeta no soportada por esta opción de pago" }, { status: 400 });
    }
    if (!(await paywayDisponibleParaSeccion("curso"))) {
        return NextResponse.json({ error: "Esta opción de pago no está disponible" }, { status: 503 });
    }

    const inscripcion = await prisma.inscripcionCurso.findUnique({
        where: { id: Number(inscripcionId) },
        include: { curso: true, opcion: true },
    });
    if (!inscripcion || !inscripcion.esInvitado) {
        return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });
    }
    if (inscripcion.estado === "confirmada") {
        return NextResponse.json({ error: "Esta inscripción ya está pagada" }, { status: 400 });
    }

    // El monto SIEMPRE se recalcula acá — nunca se confía en un monto enviado por el cliente.
    const monto = inscripcion.opcion?.precioNoMatriculado ?? 0;
    if (monto <= 0) {
        return NextResponse.json({ error: "Este curso no tiene costo asociado" }, { status: 400 });
    }

    try {
        const resultado = await autorizarPagoPayway({
            siteTransactionId: `curso_${inscripcion.id}_${Date.now()}`,
            token,
            marca,
            bin,
            amount: monto,
            descripcion: `Curso: ${inscripcion.curso.titulo}`,
            itemNombre: inscripcion.curso.titulo,
            facturacion: {
                nombre: inscripcion.guestNombre ?? "",
                apellido: inscripcion.guestApellido ?? "",
                email: inscripcion.guestEmail ?? "",
                telefono: inscripcion.guestTelefono ?? "",
                direccion: facturacion.direccion,
                ciudad: facturacion.ciudad,
                provincia: facturacion.provincia,
                codigoPostal: facturacion.codigoPostal,
                // Cybersource rechaza el customer_id si es un email — usar el DNI y, si
                // no hay, el id de la inscripción (nunca el mail).
                clienteId: inscripcion.guestDni ?? String(inscripcion.id),
                esInvitado: true,
            },
        });

        if (!resultado.aprobado) {
            console.error(`[payway] Pago rechazado — inscripcion ${inscripcion.id}:`, resultado.status, resultado.motivoRechazo, JSON.stringify(resultado.raw));
            return NextResponse.json({ aprobado: false, mensaje: "El pago fue rechazado. Verificá los datos de la tarjeta o probá con otra." }, { status: 200 });
        }

        // inscritos ya se contó al crear la inscripción (inscribirse/route.ts) — no se
        // vuelve a incrementar acá al confirmar el pago.
        await prisma.inscripcionCurso.update({
            where: { id: inscripcion.id },
            data: { estado: "confirmada", metodoPago: "payway", paywayPaymentId: String(resultado.paymentId), fechaPago: new Date() },
        });

        if (inscripcion.guestEmail) {
            enviarInscripcionCursoConfirmada(inscripcion.guestEmail, inscripcion.curso.titulo, inscripcion.opcion?.infoPrivada).catch(err => console.error("[mailer] error enviando confirmación a invitado:", err));
        }

        return NextResponse.json({ aprobado: true });
    } catch (err) {
        console.error("[payway] Error al procesar pago:", err);
        return NextResponse.json({ error: "No se pudo procesar el pago. Intentá de nuevo." }, { status: 502 });
    }
}
