import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const noticias = await prisma.noticia.findMany({
        where: { activa: true },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            titulo: true,
            contenido: true,
            imagen: true,
            imagenes: true,
            destacada: true,
            createdAt: true,
        },
    });

    return NextResponse.json(noticias);
}
