export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;

    const conv = await prisma.conversacion.findUnique({
        where: { id: parseInt(id) },
        include: { mensajes: { orderBy: { createdAt: "asc" } } },
    });
    if (!conv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    // Mark user messages as read
    await prisma.mensajeChat.updateMany({
        where: { conversacionId: conv.id, de: "user", leido: false },
        data: { leido: true },
    });

    return NextResponse.json(conv);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;
    const { archivada } = await req.json();
    const conv = await prisma.conversacion.update({ where: { id: parseInt(id) }, data: { archivada } });
    return NextResponse.json(conv);
}
