import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { categoriaId, nombre, descripcion, archivo, tipo, tamano } = await req.json();
    if (!categoriaId || !nombre?.trim() || !archivo) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    const arch = await prisma.repositorioArchivo.create({
        data: { categoriaId: parseInt(categoriaId), nombre: nombre.trim(), descripcion: descripcion?.trim() || null, archivo, tipo: tipo || "pdf", tamano: tamano || null },
    });
    return NextResponse.json(arch);
}
