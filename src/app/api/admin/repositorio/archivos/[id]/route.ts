import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;
    const { nombre, descripcion, categoriaId } = await req.json();
    const data: any = {};
    if (nombre !== undefined) data.nombre = nombre.trim();
    if (descripcion !== undefined) data.descripcion = descripcion?.trim() || null;
    if (categoriaId !== undefined) data.categoriaId = parseInt(categoriaId);
    const arch = await prisma.repositorioArchivo.update({ where: { id: parseInt(id) }, data });
    return NextResponse.json(arch);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;
    await prisma.repositorioArchivo.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ ok: true });
}
