import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    const categorias = await prisma.bibliotecaCategoria.findMany({ orderBy: { nombre: "asc" } });
    return NextResponse.json(categorias);
}

export async function POST(req: Request) {
    const { nombre } = await req.json();
    if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    try {
        const cat = await prisma.bibliotecaCategoria.create({ data: { nombre: nombre.trim() } });
        return NextResponse.json(cat, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Ya existe esa categoría" }, { status: 409 });
    }
}
