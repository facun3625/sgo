import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { titulo, descripcion, videoUrl, tipo, activo, orden } = body;

    const data: Record<string, unknown> = {};
    if (titulo !== undefined) data.titulo = titulo.trim();
    if (descripcion !== undefined) data.descripcion = descripcion?.trim() || null;
    if (videoUrl !== undefined) data.videoUrl = videoUrl.trim();
    if (tipo !== undefined) data.tipo = tipo === "embed" ? "embed" : "url";
    if (activo !== undefined) data.activo = activo;
    if (orden !== undefined) data.orden = orden;

    const tutorial = await prisma.tutorial.update({ where: { id: parseInt(id) }, data });
    return NextResponse.json(tutorial);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    await prisma.tutorial.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ ok: true });
}
