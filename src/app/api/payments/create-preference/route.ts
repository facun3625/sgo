import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getMpClients, encodeRef, TipoPago } from "@/lib/mercadopago";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.expediente) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { tipo, ref, extra }: { tipo: TipoPago; ref: string; extra?: string } = await req.json();
    const expediente = session.expediente;

    let title = "";
    let unitPrice = 0;
    let quantity = 1;

    try {
        // ── Validar y obtener precio según tipo ──────────────────────────────
        if (tipo === "matricula_mensual") {
            const cuota = await prisma.cuotaMensual.findUnique({ where: { id: parseInt(ref) } });
            if (!cuota || cuota.expediente !== expediente) {
                return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 });
            }
            if (cuota.estado === "pagado") {
                return NextResponse.json({ error: "Esta cuota ya fue abonada" }, { status: 400 });
            }
            title = `Cuota mensual ${cuota.periodo}`;
            unitPrice = cuota.monto;

        } else if (tipo === "matricula_anual") {
            const config = await prisma.config.findUnique({ where: { clave: "montoAnual" } });
            const existente = await prisma.pagoAnual.findFirst({ where: { expediente } });
            if (existente) {
                return NextResponse.json({ error: "Ya tenés el pago anual registrado" }, { status: 400 });
            }
            title = "Matrícula anual";
            unitPrice = config ? parseFloat(config.valor) : 48000;

        } else if (tipo === "curso") {
            const inscripcion = await prisma.inscripcionCurso.findUnique({
                where: { id: parseInt(ref) },
                include: { curso: true, opcion: true },
            });
            if (!inscripcion || inscripcion.expediente !== expediente) {
                return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });
            }
            if (inscripcion.estado === "confirmada") {
                return NextResponse.json({ error: "Esta inscripción ya está pagada" }, { status: 400 });
            }
            title = `Curso: ${inscripcion.curso.titulo}`;
            if (inscripcion.opcion) title += ` — ${inscripcion.opcion.nombre}`;
            unitPrice = inscripcion.opcion?.precio ?? 0;
            if (unitPrice === 0) {
                return NextResponse.json({ error: "Este curso no tiene costo asociado" }, { status: 400 });
            }

        } else if (tipo === "producto") {
            const producto = await prisma.producto.findUnique({ where: { id: parseInt(ref) } });
            if (!producto || !producto.habilitado) {
                return NextResponse.json({ error: "Producto no disponible" }, { status: 404 });
            }
            quantity = parseInt(extra ?? "1");
            if (producto.stock < quantity) {
                return NextResponse.json({ error: "Stock insuficiente" }, { status: 400 });
            }
            title = producto.nombre;
            unitPrice = producto.precio;

        } else if (tipo === "deuda") {
            const ids = ref.split(",").map((id) => parseInt(id)).filter((id) => !isNaN(id));
            if (ids.length === 0) return NextResponse.json({ error: "Sin deudas especificadas" }, { status: 400 });
            const deudas = await prisma.deuda.findMany({ where: { id: { in: ids }, expediente } });
            if (deudas.length === 0) return NextResponse.json({ error: "Deudas no encontradas" }, { status: 404 });
            title = `Deuda pendiente — ${deudas.length} concepto${deudas.length > 1 ? "s" : ""}`;
            unitPrice = deudas.reduce((acc, d) => acc + d.monto, 0);

        } else {
            return NextResponse.json({ error: "Tipo de pago inválido" }, { status: 400 });
        }

        // ── Crear preferencia en MP ──────────────────────────────────────────
        const externalReference = encodeRef({ tipo, expediente, ref: ref ?? expediente, extra });

        let mpClients;
        try {
            mpClients = await getMpClients();
        } catch {
            return NextResponse.json({ error: "Pagos no configurados. Contactá al administrador." }, { status: 503 });
        }

        const preference = await mpClients.preference.create({
            body: {
                items: [{ id: externalReference, title, unit_price: unitPrice, quantity, currency_id: "ARS" }],
                external_reference: externalReference,
                back_urls: {
                    success: `${BASE_URL}/dashboard/pagos?mp=success`,
                    failure: `${BASE_URL}/dashboard/pagos?mp=failure`,
                    pending: `${BASE_URL}/dashboard/pagos?mp=pending`,
                },
                auto_return: "approved",
                notification_url: `${BASE_URL}/api/payments/webhook`,
            },
        });

        return NextResponse.json({ init_point: preference.init_point });

    } catch (err) {
        console.error("[MP create-preference]", err);
        return NextResponse.json({ error: "Error al generar el pago" }, { status: 500 });
    }
}
