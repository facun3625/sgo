import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const data = await req.json();

    const update: { nombre?: string; tipo?: string; aplicaMulta?: boolean; activo?: boolean } = {};
    if (data.nombre !== undefined) update.nombre = data.nombre.trim();
    if (data.tipo !== undefined) update.tipo = data.tipo;
    if (data.aplicaMulta !== undefined) update.aplicaMulta = !!data.aplicaMulta;
    if (data.activo !== undefined) update.activo = data.activo;

    const motivo = await prisma.motivoSuspension.update({
        where: { id: Number(id) },
        data: update,
    });
    return NextResponse.json(motivo);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    await prisma.motivoSuspension.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
}
