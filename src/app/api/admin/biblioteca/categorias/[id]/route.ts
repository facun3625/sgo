import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { nombre } = await req.json();
    if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    try {
        const cat = await prisma.bibliotecaCategoria.update({
            where: { id: parseInt(id) },
            data: { nombre: nombre.trim() },
        });
        return NextResponse.json(cat);
    } catch {
        return NextResponse.json({ error: "Ya existe esa categoría" }, { status: 409 });
    }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await prisma.bibliotecaCategoria.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ ok: true });
}
