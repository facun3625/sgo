import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const cursoId = parseInt(id);

    const curso = await prisma.curso.findUnique({
        where: { id: cursoId },
        include: { dias: { orderBy: { orden: "asc" } } },
    });
    if (!curso) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const inscripciones = await prisma.inscripcionCurso.findMany({
        where: { cursoId, estado: "confirmada" },
        include: { opcion: true },
    });

    const sesiones = await prisma.sesionAsistencia.findMany({
        where: { cursoId },
        include: { asistencias: true },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ curso, inscripciones, sesiones });
}
