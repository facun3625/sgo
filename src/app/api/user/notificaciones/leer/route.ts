import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    let body: { id?: number } = {};
    try {
        body = await req.json();
    } catch {
        // body vacío — marcar todas
    }

    if (body.id) {
        await prisma.notificacion.updateMany({
            where: { id: body.id, expediente: session.expediente },
            data: { leida: true },
        });
    } else {
        await prisma.notificacion.updateMany({
            where: { expediente: session.expediente, leida: false },
            data: { leida: true },
        });
    }

    return NextResponse.json({ success: true });
}
