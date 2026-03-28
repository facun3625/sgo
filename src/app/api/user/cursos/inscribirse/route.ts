import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { cursoId, opcionId } = await req.json();

    if (!cursoId || !opcionId) {
        return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    // Verificar que el curso existe y está activo
    const curso = await prisma.curso.findUnique({
        where: { id: Number(cursoId), activo: true },
    });
    if (!curso) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    // Verificar fecha límite
    if (curso.fechaLimiteInscripcion && new Date() > curso.fechaLimiteInscripcion) {
        return NextResponse.json({ error: "El período de inscripción ha cerrado" }, { status: 400 });
    }

    // Verificar que la opción existe
    const opcion = await prisma.cursoOpcion.findUnique({
        where: { id: Number(opcionId), cursoId: Number(cursoId) },
    });
    if (!opcion) return NextResponse.json({ error: "Opción no válida" }, { status: 400 });

    // Verificar cupo (0 = sin límite)
    if (opcion.cupo > 0 && opcion.inscritos >= opcion.cupo) {
        return NextResponse.json({ error: "No hay cupos disponibles para esta opción" }, { status: 400 });
    }

    // Verificar si ya está inscrito
    const yaInscrito = await prisma.inscripcionCurso.findFirst({
        where: { expediente: session.expediente, cursoId: Number(cursoId) },
    });
    if (yaInscrito) return NextResponse.json({ error: "Ya estás inscrito en este curso" }, { status: 400 });

    // Crear inscripción e incrementar inscritos en la opción
    await prisma.$transaction([
        prisma.inscripcionCurso.create({
            data: {
                expediente: session.expediente,
                cursoId: Number(cursoId),
                opcionId: Number(opcionId),
                estado: opcion.precio === 0 ? "confirmada" : "pendiente_pago",
            },
        }),
        prisma.cursoOpcion.update({
            where: { id: Number(opcionId) },
            data: { inscritos: { increment: 1 } },
        }),
    ]);

    return NextResponse.json({ success: true });
}
