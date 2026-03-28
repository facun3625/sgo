export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getSession();

        if (!session || !session.expediente) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const eventos = await prisma.evento.findMany({
            orderBy: { fecha: "asc" }
        });

        // Cursos marcados para mostrar en calendario
        const cursos = await prisma.curso.findMany({
            where: { mostrarEnCalendario: true, activo: true },
        });

        const cursosComoEventos = cursos.map(curso => ({
            id: `curso-${curso.id}`,
            cursoId: curso.id,
            titulo: curso.titulo,
            descripcion: curso.descripcion,
            fecha: curso.fecha,
            tipo: "curso",
            isCurso: true,
        }));

        return NextResponse.json([...eventos, ...cursosComoEventos]);

    } catch (error) {
        console.error("Error fetching events:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
