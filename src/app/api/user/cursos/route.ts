import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getSession();

        if (!session || !session.expediente) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const cursos = await prisma.curso.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: {
                        // Correctly, InscripcionCurso is related but maybe I need a relation field in schema
                        // For now, I'll count manually in the request or just use the field in the model if I don't set up relations.
                        // I'll check the schema again.
                    }
                }
            }
        });

        // I'll also check if the user is already enrolled in each course
        const inscripciones = await prisma.inscripcionCurso.findMany({
            where: { expediente: session.expediente }
        });

        const enrolledCourseIds = inscripciones.map(ins => ins.cursoId);

        const cursosWithStatus = cursos.map(curso => ({
            ...curso,
            isEnrolled: enrolledCourseIds.includes(curso.id),
            isFull: curso.inscritos >= curso.cupo
        }));

        return NextResponse.json(cursosWithStatus);

    } catch (error) {
        console.error("Error fetching courses:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
