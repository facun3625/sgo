import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { autorizarPagoPayway, construirSiteTransactionId, marcaSoportadaPayway, paywayDisponibleParaSeccion, PaywaySeccion } from "@/lib/payway";
import { esMatriculadoJoven, montoConDescuento } from "@/lib/matricula";
import { crearNotificacion } from "@/lib/notificaciones";
import { calcularMontoComprobantes, confirmarPagoComprobantes, parseIdsDeuda } from "@/lib/pagoDeuda";

// Cobro con tarjeta (Payway) para matriculados logueados: cuota mensual, matrícula
// anual, deudas vencidas y compra de productos (ventas). Mismo cálculo de precio que
// /api/payments/create-preference (Mercado Pago), pero acá el pago se autoriza en la
// misma request — sin webhook.
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.expediente) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const expediente = session.expediente;

    const { tipo, ref, extra, token, marca, bin, facturacion } = await req.json();
    if (!tipo || !ref || !token || !marca || !bin || !facturacion) {
        return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }
    if (!marcaSoportadaPayway(marca)) {
        return NextResponse.json({ error: "Tarjeta no soportada por esta opción de pago" }, { status: 400 });
    }

    const seccion: PaywaySeccion | null =
        tipo === "matricula_mensual" ? "matricula_mensual" :
        tipo === "matricula_anual" ? "matricula_anual" :
        tipo === "deuda" ? "deuda" :
        tipo === "producto" ? "ventas" : null;
    if (!seccion) return NextResponse.json({ error: "Tipo de pago inválido" }, { status: 400 });
    if (!(await paywayDisponibleParaSeccion(seccion))) {
        return NextResponse.json({ error: "Esta opción de pago no está disponible" }, { status: 503 });
    }

    let descripcion = "";
    let monto = 0;
    let cantidad = 1;

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

    } else if (tipo === "deuda") {
        const ids = parseIdsDeuda(ref);
        if (ids.length === 0) return NextResponse.json({ error: "Sin comprobantes especificados" }, { status: 400 });
        const { comprobantes, monto: montoComprobantes } = await calcularMontoComprobantes(expediente, ids);
        if (comprobantes.length === 0) return NextResponse.json({ error: "Comprobantes no encontrados" }, { status: 404 });
        descripcion = `Deuda pendiente — ${comprobantes.length} comprobante${comprobantes.length > 1 ? "s" : ""}`;
        monto = montoComprobantes;

    } else {
        // producto: ref = productoId, extra = cantidad (mismo contrato que create-preference)
        const productoId = parseInt(ref);
        cantidad = parseInt(extra ?? "1");
        if (isNaN(productoId) || isNaN(cantidad) || cantidad < 1) {
            return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
        }
        const producto = await prisma.producto.findUnique({ where: { id: productoId } });
        if (!producto || !producto.habilitado) {
            return NextResponse.json({ error: "Producto no disponible" }, { status: 400 });
        }
        if (producto.stock < cantidad) {
            return NextResponse.json({ error: "Stock insuficiente" }, { status: 400 });
        }
        if (producto.limiteMensual !== null) {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const pedidosMes = await prisma.pedido.count({
                where: { expediente, productoId, estado: { not: "cancelado" }, createdAt: { gte: startOfMonth } },
            });
            if (pedidosMes + cantidad > producto.limiteMensual) {
                return NextResponse.json({ error: `Superás el límite mensual de ${producto.limiteMensual} para este producto` }, { status: 400 });
            }
        }
        descripcion = `Compra: ${producto.nombre}${cantidad > 1 ? ` x${cantidad}` : ""}`;
        monto = producto.precio * cantidad;
    }

    if (monto <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });

    const dato = await prisma.dato.findFirst({ where: { expediente } });

    try {
        const resultado = await autorizarPagoPayway({
            siteTransactionId: construirSiteTransactionId(tipo, expediente, descripcion),
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

        } else if (tipo === "deuda") {
            const ids = parseIdsDeuda(ref);
            await confirmarPagoComprobantes(expediente, ids, { metodoPago: "payway", paywayPaymentId });
            await crearNotificacion(expediente, "Deuda regularizada", `Tu pago de $${monto.toLocaleString("es-AR")} fue acreditado correctamente.`, "pago");

        } else {
            const productoId = parseInt(ref);
            const producto = await prisma.producto.findUnique({ where: { id: productoId } });
            await prisma.$transaction([
                prisma.pedido.create({
                    data: { expediente, productoId, cantidad, metodoPago: "payway", estado: "aprobado", paywayPaymentId },
                }),
                prisma.producto.update({ where: { id: productoId }, data: { stock: { decrement: cantidad } } }),
            ]);
            if (producto) {
                await crearNotificacion(expediente, "Pedido confirmado", `Tu compra de "${producto.nombre}" (x${cantidad}) fue confirmada. Ya podés retirarlo.`, "pedido");
            }
        }

        return NextResponse.json({ aprobado: true });
    } catch (err) {
        console.error("[payway] Error al procesar pago:", err);
        return NextResponse.json({ error: "No se pudo procesar el pago. Intentá de nuevo." }, { status: 502 });
    }
}
