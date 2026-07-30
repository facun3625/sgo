import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMpClients, encodeRef } from "@/lib/mercadopago";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

// Preferencia de pago MercadoPago para inscripciones de invitados (sin sesión).
export async function POST(req: NextRequest) {
    const { inscripcionId } = await req.json();
    if (!inscripcionId) return NextResponse.json({ error: "Falta la inscripción" }, { status: 400 });

    try {
        const inscripcion = await prisma.inscripcionCurso.findUnique({
            where: { id: parseInt(inscripcionId) },
            include: { curso: true, opcion: true },
        });
        if (!inscripcion || !inscripcion.esInvitado) {
            return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });
        }
        if (inscripcion.estado === "confirmada") {
            return NextResponse.json({ error: "Esta inscripción ya está pagada" }, { status: 400 });
        }

        const unitPrice = inscripcion.opcion?.precioNoMatriculado ?? 0;
        if (unitPrice === 0) {
            return NextResponse.json({ error: "Este curso no tiene costo asociado" }, { status: 400 });
        }

        let title = `Curso: ${inscripcion.curso.titulo}`;
        if (inscripcion.opcion) title += ` — ${inscripcion.opcion.nombre}`;

        const externalReference = encodeRef({ tipo: "curso", expediente: inscripcion.expediente, ref: String(inscripcion.id) });

        let mpClients;
        try {
            mpClients = await getMpClients();
        } catch {
            return NextResponse.json({ error: "Pagos no configurados. Contactá al administrador." }, { status: 503 });
        }

        const isPublicUrl = BASE_URL.startsWith("https://");

        const preference = await mpClients.preference.create({
            body: {
                items: [{ id: externalReference, title, unit_price: unitPrice, quantity: 1, currency_id: "ARS" }],
                external_reference: externalReference,
                payment_methods: {
                    excluded_payment_types: [{ id: "ticket" }],
                },
                ...(isPublicUrl && {
                    back_urls: {
                        success: `${BASE_URL}/cursos/${inscripcion.cursoId}?mp=success`,
                        failure: `${BASE_URL}/cursos/${inscripcion.cursoId}?mp=failure`,
                        pending: `${BASE_URL}/cursos/${inscripcion.cursoId}?mp=pending`,
                    },
                    auto_return: "approved",
                    notification_url: `${BASE_URL}/api/payments/webhook`,
                }),
            },
        });

        const token = (await prisma.config.findUnique({ where: { clave: "mpAccessToken" } }))?.valor ?? process.env.MP_ACCESS_TOKEN ?? "";
        const isSandbox = token.startsWith("TEST-");
        const url = isSandbox ? preference.sandbox_init_point : preference.init_point;

        return NextResponse.json({ init_point: url });

    } catch (err: unknown) {
        const mpErr = err as { cause?: unknown; message?: string };
        console.error("[MP create-preference invitado]", JSON.stringify(mpErr?.cause ?? err, null, 2));
        const detail = mpErr?.cause ? JSON.stringify(mpErr.cause) : mpErr?.message ?? "desconocido";
        return NextResponse.json({ error: `Error al generar el pago: ${detail}` }, { status: 500 });
    }
}
