export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getSession();
    if (!session?.expediente) return NextResponse.json([], { status: 401 });

    const destinatarios = await prisma.envioMasivoDestinatario.findMany({
        where: { expediente: session.expediente },
        orderBy: { envio: { createdAt: "desc" } },
        include: {
            envio: { select: { id: true, asunto: true, contenido: true, createdAt: true } },
        },
    });

    const result = destinatarios.map(d => ({
        id: d.envio.id,
        destinatarioId: d.id,
        asunto: d.envio.asunto,
        contenido: d.envio.contenido,
        leido: d.leido,
        leidoAt: d.leidoAt,
        createdAt: d.envio.createdAt,
    }));

    return NextResponse.json(result);
}
