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

        // También incluimos los cursos como eventos del calendario
        const cursos = await prisma.curso.findMany();

        // Mapeamos cursos a formato de evento
        const cursosComoEventos = cursos.map(curso => ({
            id: `curso-${curso.id}`,
            titulo: curso.titulo,
            descripcion: curso.descripcion,
            fecha: curso.fecha, // Ojo: en el modelo Curso la fecha es String actualmente, 
            // idealmente debería ser DateTime para el calendario, pero lo adaptaremos en el front.
            tipo: "curso",
            isCurso: true
        }));

        return NextResponse.json([...eventos, ...cursosComoEventos]);

    } catch (error) {
        console.error("Error fetching events:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
