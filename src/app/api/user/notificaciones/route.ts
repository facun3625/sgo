import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const notificaciones = await prisma.notificacion.findMany({
        where: { expediente: session.expediente },
        orderBy: { createdAt: "desc" },
    });

    const unreadCount = notificaciones.filter((n) => !n.leida).length;

    return NextResponse.json({ notificaciones, unreadCount });
}
