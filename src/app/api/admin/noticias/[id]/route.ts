import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { id } = await params;
    const noticia = await prisma.noticia.findUnique({ where: { id: parseInt(id) } });
    if (!noticia) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    return NextResponse.json(noticia);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { id } = await params;
    const { titulo, contenido, imagen, imagenes, activa, destacada } = await req.json();
    const noticia = await prisma.noticia.update({
        where: { id: parseInt(id) },
        data: { titulo, contenido, imagen: imagen || null, imagenes: imagenes || [], activa, destacada },
    });
    return NextResponse.json(noticia);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { id } = await params;
    await prisma.noticia.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
}
