import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Registro de comprobante de transferencia para inscripciones de invitados (sin sesión).
export async function POST(req: NextRequest) {
    const { inscripcionId, comprobante } = await req.json();
    if (!inscripcionId || !comprobante) {
        return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    const config = await prisma.config.findUnique({ where: { clave: "transferencia_curso" } });
    if (!config || config.valor !== "1") {
        return NextResponse.json({ error: "Transferencia no habilitada para cursos" }, { status: 400 });
    }

    const inscripcion = await prisma.inscripcionCurso.findUnique({
        where: { id: parseInt(inscripcionId) },
        include: { opcion: true },
    });
    if (!inscripcion || !inscripcion.esInvitado) {
        return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });
    }
    if (inscripcion.estado === "confirmada") {
        return NextResponse.json({ error: "Esta inscripción ya está pagada" }, { status: 400 });
    }

    const monto = inscripcion.opcion?.precioNoMatriculado ?? 0;

    const yaExiste = await prisma.pagoPendiente.findFirst({
        where: { expediente: inscripcion.expediente, tipo: "curso", ref: String(inscripcion.id), estado: "pendiente" },
    });
    if (yaExiste) return NextResponse.json({ error: "Ya tenés un comprobante enviado esperando aprobación" }, { status: 400 });

    const pago = await prisma.pagoPendiente.create({
        data: { expediente: inscripcion.expediente, tipo: "curso", ref: String(inscripcion.id), monto, comprobante },
    });

    return NextResponse.json(pago);
}
