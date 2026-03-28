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
    const noticias = await prisma.noticia.findMany({
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(noticias);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { titulo, contenido, imagen, imagenes, activa, destacada } = await req.json();
    const noticia = await prisma.noticia.create({
        data: {
            titulo,
            contenido,
            imagen: imagen || null,
            imagenes: imagenes || [],
            activa: activa ?? true,
            destacada: destacada ?? false,
        },
    });
    return NextResponse.json(noticia);
}
