import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    const { categoriaId, pregunta, respuesta } = await req.json();
    if (!categoriaId || !pregunta?.trim() || !respuesta?.trim())
        return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
    const last = await prisma.faq.findFirst({ where: { categoriaId }, orderBy: { orden: "desc" } });
    const faq = await prisma.faq.create({
        data: { categoriaId, pregunta: pregunta.trim(), respuesta: respuesta.trim(), orden: (last?.orden ?? -1) + 1 },
    });
    return NextResponse.json(faq, { status: 201 });
}
