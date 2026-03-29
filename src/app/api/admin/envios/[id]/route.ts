export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const envio = await prisma.envioMasivo.findUnique({
        where: { id: Number(id) },
        include: { destinatarios: { orderBy: { leidoAt: "asc" } } },
    });
    if (!envio) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    // Enrich with user names
    const expedientes = envio.destinatarios.map(d => d.expediente);
    const users = await prisma.dato.findMany({
        where: { expediente: { in: expedientes } },
        select: { expediente: true, apellido: true, nombre: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.expediente, u]));

    // Build timeline: group leidoAt by day
    const timelineBuckets: Record<string, number> = {};
    for (const d of envio.destinatarios) {
        if (!d.leido || !d.leidoAt) continue;
        const key = d.leidoAt.toISOString().slice(0, 10); // YYYY-MM-DD
        timelineBuckets[key] = (timelineBuckets[key] || 0) + 1;
    }
    const timeline = Object.entries(timelineBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

    const destinatarios = envio.destinatarios.map(d => ({
        id: d.id,
        expediente: d.expediente,
        nombre: userMap[d.expediente] ? `${userMap[d.expediente].apellido}, ${userMap[d.expediente].nombre}` : d.expediente,
        leido: d.leido,
        leidoAt: d.leidoAt,
    }));

    return NextResponse.json({
        id: envio.id,
        asunto: envio.asunto,
        contenido: envio.contenido,
        totalEnvios: envio.totalEnvios,
        leidos: destinatarios.filter(d => d.leido).length,
        createdAt: envio.createdAt,
        timeline,
        destinatarios,
    });
}
