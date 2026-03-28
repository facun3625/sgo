import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    const eventos = await prisma.evento.findMany({ orderBy: { fecha: "asc" } });
    return NextResponse.json(eventos);
}

export async function POST(req: Request) {
    const { titulo, descripcion, fecha, tipo } = await req.json();
    if (!titulo || !fecha) return NextResponse.json({ error: "Título y fecha son requeridos" }, { status: 400 });
    const evento = await prisma.evento.create({
        data: { titulo, descripcion: descripcion || null, fecha: new Date(fecha), tipo: tipo || "institucional" },
    });
    return NextResponse.json(evento, { status: 201 });
}
