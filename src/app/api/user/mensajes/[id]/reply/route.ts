import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session?.expediente) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;
    const { contenido } = await req.json();
    if (!contenido?.trim()) return NextResponse.json({ error: "Contenido requerido" }, { status: 400 });

    const conv = await prisma.conversacion.findFirst({
        where: { id: parseInt(id), expediente: session.expediente },
    });
    if (!conv) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const [msg] = await prisma.$transaction([
        prisma.mensajeChat.create({
            data: { conversacionId: parseInt(id), de: "user", contenido: contenido.trim() },
        }),
        prisma.conversacion.update({
            where: { id: parseInt(id) },
            data: { updatedAt: new Date() },
        }),
    ]);

    return NextResponse.json(msg);
}
