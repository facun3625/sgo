import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    const cats = await prisma.faqCategoria.findMany({
        orderBy: { orden: "asc" },
        include: { faqs: { orderBy: { orden: "asc" } } },
    });
    return NextResponse.json(cats);
}

export async function POST(req: Request) {
    const { nombre } = await req.json();
    if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    const last = await prisma.faqCategoria.findFirst({ orderBy: { orden: "desc" } });
    const cat = await prisma.faqCategoria.create({ data: { nombre: nombre.trim(), orden: (last?.orden ?? -1) + 1 } });
    return NextResponse.json(cat, { status: 201 });
}
