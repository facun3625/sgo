import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;
    const item = await prisma.biblioteca.findUnique({ where: { id: parseInt(id) } });
    if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;
    const { tipo, titulo, autor, categoria, tags, archivo, portada, activa, destacado } = await req.json();
    const item = await prisma.biblioteca.update({
        where: { id: parseInt(id) },
        data: { tipo, titulo, autor, categoria, tags: tags || [], archivo, portada: portada || null, activa, destacado: destacado ?? false },
    });
    return NextResponse.json(item);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;
    await prisma.biblioteca.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
}
