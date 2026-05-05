export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getSession();
    if (!session || !session.expediente) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const [historial, apercibimientos] = await Promise.all([
        prisma.historialMatricula.findMany({
            where: { expediente: session.expediente },
            orderBy: { createdAt: "desc" },
        }),
        prisma.tribunalEtica.findMany({
            where: { expediente: session.expediente },
            orderBy: { inicio: "desc" },
        }),
    ]);

    return NextResponse.json({ historial, apercibimientos });
}
