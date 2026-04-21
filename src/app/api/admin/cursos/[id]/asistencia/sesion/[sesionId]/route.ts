import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

// PATCH: cerrar / reabrir sesión
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; sesionId: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { sesionId } = await params;
    const body = await req.json();

    const sesion = await prisma.sesionAsistencia.update({
        where: { id: parseInt(sesionId) },
        data: { activa: body.activa },
        include: { asistencias: true },
    });

    return NextResponse.json(sesion);
}

// POST: marcar/desmarcar asistencia manual
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; sesionId: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { sesionId } = await params;
    const body = await req.json();
    const { expediente, presente } = body;

    if (presente) {
        await prisma.asistenciaCurso.upsert({
            where: { sesionId_expediente: { sesionId: parseInt(sesionId), expediente } },
            create: { sesionId: parseInt(sesionId), expediente },
            update: {},
        });
    } else {
        await prisma.asistenciaCurso.deleteMany({
            where: { sesionId: parseInt(sesionId), expediente },
        });
    }

    return NextResponse.json({ ok: true });
}
