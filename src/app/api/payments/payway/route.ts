import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { autorizarPagoPayway, marcaSoportadaPayway, paywayDisponibleParaSeccion, PaywaySeccion } from "@/lib/payway";
import { esMatriculadoJoven, montoConDescuento } from "@/lib/matricula";
import { crearNotificacion } from "@/lib/notificaciones";

// Cobro con tarjeta (Payway) para matriculados logueados: cuota mensual, matrícula
// anual y deudas vencidas. Mismo cálculo de precio que /api/payments/create-preference
// (Mercado Pago), pero acá el pago se autoriza en la misma request — sin webhook.
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.expediente) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const expediente = session.expediente;

    const { tipo, ref, token, marca, bin, facturacion } = await req.json();
    if (!tipo || !ref || !token || !marca || !bin || !facturacion) {
        return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }
    if (!marcaSoportadaPayway(marca)) {
        return NextResponse.json({ error: "Tarjeta no soportada por esta opción de pago" }, { status: 400 });
    }

    const seccion: PaywaySeccion | null =
        tipo === "matricula_mensual" ? "matricula_mensual" :
        tipo === "matricula_anual" ? "matricula_anual" :
        tipo === "deuda" ? "deuda" : null;
    if (!seccion) return NextResponse.json({ error: "Tipo de pago inválido" }, { status: 400 });
    if (!(await paywayDisponibleParaSeccion(seccion))) {
        return NextResponse.json({ error: "Esta opción de pago no está disponible" }, { status: 503 });
    }

    let descripcion = "";
    let monto = 0;

    // ── Validar y obtener precio según tipo (mismo cálculo que create-preference) ──
    if (tipo === "matricula_mensual") {
        const cuota = await prisma.cuotaMensual.findUnique({ where: { id: parseInt(ref) } });
        if (!cuota || cuota.expediente !== expediente) {
            return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 });
        }
        if (cuota.estado === "pagado") {
            return NextResponse.json({ error: "Esta cuota ya fue abonada" }, { status: 400 });
        }
        descripcion = `Cuota mensual ${cuota.periodo}`;
        monto = cuota.monto;

    } else if (tipo === "matricula_anual") {
        const [config, existente, dato] = await Promise.all([
            prisma.config.findUnique({ where: { clave: "montoAnual" } }),
            prisma.pagoAnual.findFirst({ where: { expediente } }),
            prisma.dato.findFirst({ where: { expediente }, select: { fechaMatriculacion: true } }),
        ]);
        if (existente) {
            return NextResponse.json({ error: "Ya tenés el pago anual registrado" }, { status: 400 });
        }
        const montoBase = config ? parseFloat(config.valor) : 48000;
        descripcion = "Matrícula anual";
        monto = montoConDescuento(montoBase, esMatriculadoJoven(dato?.fechaMatriculacion));

    } else {
        // deuda: ref = ids separados por coma
        const ids = String(ref).split(",").map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id));
        if (ids.length === 0) return NextResponse.json({ error: "Sin deudas especificadas" }, { status: 400 });
        const deudas = await prisma.deuda.findMany({ where: { id: { in: ids }, expediente } });
        if (deudas.length === 0) return NextResponse.json({ error: "Deudas no encontradas" }, { status: 404 });
        descripcion = `Deuda pendiente — ${deudas.length} concepto${deudas.length > 1 ? "s" : ""}`;
        monto = deudas.reduce((acc, d) => acc + d.monto, 0);
    }

    if (monto <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });

    const dato = await prisma.dato.findFirst({ where: { expediente } });

    try {
        const resultado = await autorizarPagoPayway({
            siteTransactionId: `${tipo}_${expediente}_${Date.now()}`,
            token,
            marca,
            bin,
            amount: monto,
            descripcion,
            itemNombre: descripcion,
            facturacion: {
                nombre: dato?.nombre ?? "",
                apellido: dato?.apellido ?? "",
                email: dato?.emailLegal || dato?.emailReal || "",
                telefono: dato?.movilLegal || dato?.movilReal || "",
                direccion: facturacion.direccion,
                ciudad: facturacion.ciudad,
                provincia: facturacion.provincia,
                codigoPostal: facturacion.codigoPostal,
                clienteId: expediente,
                esInvitado: false,
            },
        });

        if (!resultado.aprobado) {
            console.error(`[payway] Pago rechazado — ${tipo} ${expediente}:`, resultado.status, resultado.motivoRechazo, JSON.stringify(resultado.raw));
            return NextResponse.json({ aprobado: false, mensaje: "El pago fue rechazado. Verificá los datos de la tarjeta o probá con otra." }, { status: 200 });
        }

        const paywayPaymentId = String(resultado.paymentId);
        const fechaPago = new Date();

        if (tipo === "matricula_mensual") {
            await prisma.cuotaMensual.update({
                where: { id: parseInt(ref) },
                data: { estado: "pagado", metodoPago: "payway", paywayPaymentId, fechaPago },
            });
            await crearNotificacion(expediente, "Pago de cuota confirmado", "Tu pago de la cuota fue acreditado correctamente.", "pago");

        } else if (tipo === "matricula_anual") {
            await prisma.pagoAnual.create({ data: { expediente, paywayPaymentId, fechaPago } });
            await crearNotificacion(expediente, "Matrícula anual confirmada", "Tu pago de matrícula anual fue acreditado. ¡Gracias!", "pago");

        } else {
            const ids = String(ref).split(",").map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id));
            await prisma.$transaction([
                prisma.deudaPagada.create({
                    data: { expediente, monto, paywayPaymentId, metodoPago: "payway", fechaPago },
                }),
                prisma.deuda.deleteMany({ where: { id: { in: ids }, expediente } }),
            ]);
            await crearNotificacion(expediente, "Deuda regularizada", "Tu pago de deuda vencida fue acreditado correctamente.", "pago");
        }

        return NextResponse.json({ aprobado: true });
    } catch (err) {
        console.error("[payway] Error al procesar pago:", err);
        return NextResponse.json({ error: "No se pudo procesar el pago. Intentá de nuevo." }, { status: 502 });
    }
}
