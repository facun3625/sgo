import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    const eventos = await prisma.evento.findMany({ orderBy: { fecha: "asc" } });
    return NextResponse.json(eventos);
}

export async function POST(req: Request) {
    const { titulo, descripcion, fecha, tipo } = await req.json();
    if (!titulo || !fecha) return NextResponse.json({ error: "Título y fecha son requeridos" }, { status: 400 });

    // Usar mediodía UTC para evitar desfase de timezone al mostrar la fecha
    const evento = await prisma.evento.create({
        data: { titulo, descripcion: descripcion || null, fecha: new Date(`${fecha}T12:00:00Z`), tipo: tipo || "institucional" },
    });

    // Notificar a todos los usuarios activos
    const usuarios = await prisma.user.findMany({
        where: { accessLevel: "user", status: { in: ["active", "suspended"] } },
        select: { expediente: true },
    });

    const expedientes = usuarios.map((u) => u.expediente).filter(Boolean) as string[];

    if (expedientes.length > 0) {
        await prisma.notificacion.createMany({
            data: expedientes.map((expediente) => ({
                expediente,
                titulo: `Nuevo evento: ${titulo}`,
                mensaje: descripcion
                    ? descripcion.slice(0, 100) + (descripcion.length > 100 ? "…" : "")
                    : "Se agregó un nuevo evento al calendario.",
                tipo: "evento",
            })),
        });
    }

    return NextResponse.json(evento, { status: 201 });
}
