import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { titulo, descripcion, fecha, tipo } = await req.json();
    const evento = await prisma.evento.update({
        where: { id: parseInt(id) },
        data: { titulo, descripcion: descripcion || null, fecha: new Date(fecha), tipo },
    });
    return NextResponse.json(evento);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await prisma.evento.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ ok: true });
}
