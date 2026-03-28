import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;
    const { nombre, orden } = await req.json();
    const data: any = {};
    if (nombre !== undefined) data.nombre = nombre.trim();
    if (orden !== undefined) data.orden = orden;
    const cat = await prisma.repositorioCategoria.update({ where: { id: parseInt(id) }, data });
    return NextResponse.json(cat);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;
    await prisma.repositorioCategoria.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ ok: true });
}
