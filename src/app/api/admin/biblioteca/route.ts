import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const items = await prisma.biblioteca.findMany({
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { tipo, titulo, autor, categoria, tags, archivo, portada, activa, destacado } = await req.json();
    const item = await prisma.biblioteca.create({
        data: { tipo, titulo, autor, categoria, tags: tags || [], archivo, portada: portada || null, activa: activa ?? true, destacado: destacado ?? false },
    });
    return NextResponse.json(item);
}
