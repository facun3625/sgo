import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const cats = await prisma.repositorioCategoria.findMany({
        orderBy: { orden: "asc" },
        include: { archivos: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { nombre } = await req.json();
    if (!nombre?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    const count = await prisma.repositorioCategoria.count();
    const cat = await prisma.repositorioCategoria.create({ data: { nombre: nombre.trim(), orden: count } });
    return NextResponse.json(cat);
}
