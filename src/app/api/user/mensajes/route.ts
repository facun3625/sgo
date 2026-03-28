export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getSession();
    if (!session?.expediente) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const convs = await prisma.conversacion.findMany({
        where: { expediente: session.expediente, archivada: false },
        orderBy: { updatedAt: "desc" },
        include: {
            mensajes: { orderBy: { createdAt: "desc" }, take: 1 },
            _count: { select: { mensajes: { where: { de: "admin", leido: false } } } },
        },
    });

    return NextResponse.json(convs.map(c => ({
        id: c.id,
        asunto: c.asunto,
        ultimoMensaje: c.mensajes[0] ?? null,
        unread: c._count.mensajes,
        updatedAt: c.updatedAt,
    })));
}
