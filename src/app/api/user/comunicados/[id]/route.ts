export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session?.expediente) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const dest = await prisma.envioMasivoDestinatario.findFirst({
        where: { envioId: Number(id), expediente: session.expediente },
        include: { envio: true },
    });
    if (!dest) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    // Mark comunicado as read
    if (!dest.leido) {
        await prisma.envioMasivoDestinatario.update({
            where: { id: dest.id },
            data: { leido: true, leidoAt: new Date() },
        });
    }
    // Always mark matching notification as read (even if comunicado was already read)
    await prisma.notificacion.updateMany({
        where: {
            expediente: session.expediente,
            tipo: "comunicado",
            mensaje: dest.envio.asunto,
            leida: false,
        },
        data: { leida: true },
    });

    return NextResponse.json({
        id: dest.envio.id,
        asunto: dest.envio.asunto,
        contenido: dest.envio.contenido,
        adjuntoUrl: dest.envio.adjuntoUrl,
        adjuntoTipo: dest.envio.adjuntoTipo,
        leido: true,
        createdAt: dest.envio.createdAt,
    });
}
