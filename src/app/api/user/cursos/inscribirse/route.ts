import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const session = await getSession();

        if (!session || !session.expediente) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { cursoId } = await request.json();

        if (!cursoId) {
            return NextResponse.json({ error: "ID de curso requerido" }, { status: 400 });
        }

        // 1. Verificar si el curso existe y tiene cupo
        const curso = await prisma.curso.findUnique({
            where: { id: Number(cursoId) }
        });

        if (!curso) {
            return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
        }

        if (curso.inscritos >= curso.cupo) {
            return NextResponse.json({ error: "No hay cupos disponibles" }, { status: 400 });
        }

        // 2. Verificar si ya está inscrito
        const existingInscripcion = await prisma.inscripcionCurso.findFirst({
            where: {
                expediente: session.expediente,
                cursoId: Number(cursoId)
            }
        });

        if (existingInscripcion) {
            return NextResponse.json({ error: "Usted ya se encuentra inscrito en este curso" }, { status: 400 });
        }

        // 3. Registrar inscripción y actualizar cupo (Transacción para seguridad)
        await prisma.$transaction([
            prisma.inscripcionCurso.create({
                data: {
                    expediente: session.expediente,
                    cursoId: Number(cursoId)
                }
            }),
            prisma.curso.update({
                where: { id: Number(cursoId) },
                data: {
                    inscritos: { increment: 1 }
                }
            })
        ]);

        return NextResponse.json({ message: "Inscripción exitosa" });

    } catch (error) {
        console.error("Error in course enrollment:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
