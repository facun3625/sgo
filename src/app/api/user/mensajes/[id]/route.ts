export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session?.expediente) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;

    const conv = await prisma.conversacion.findFirst({
        where: { id: parseInt(id), expediente: session.expediente },
        include: { mensajes: { orderBy: { createdAt: "asc" } } },
    });
    if (!conv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    await prisma.mensajeChat.updateMany({
        where: { conversacionId: conv.id, de: "admin", leido: false },
        data: { leido: true },
    });

    return NextResponse.json(conv);
}
