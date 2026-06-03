export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.accessLevel !== "superadmin")
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const body = await req.json();
    const { accion, comentario, fechaInicio, fechaFin, createdAt } = body;

    const data: Record<string, any> = {};
    if (accion !== undefined) data.accion = accion;
    if (comentario !== undefined) data.comentario = comentario;
    if (fechaInicio !== undefined) data.fechaInicio = fechaInicio ? new Date(fechaInicio) : null;
    if (fechaFin !== undefined) data.fechaFin = fechaFin ? new Date(fechaFin) : null;
    if (createdAt !== undefined) data.createdAt = new Date(createdAt);

    const updated = await (prisma as any).historialMatricula.update({
        where: { id },
        data,
    });

    return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.accessLevel !== "superadmin")
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    await (prisma as any).historialMatricula.delete({ where: { id } });

    return NextResponse.json({ ok: true });
}
