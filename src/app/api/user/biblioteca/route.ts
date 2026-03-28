export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const [items, favoritos] = await Promise.all([
        prisma.biblioteca.findMany({
            where: { activa: true },
            orderBy: { createdAt: "desc" },
            select: { id: true, tipo: true, titulo: true, autor: true, categoria: true, tags: true, archivo: true, portada: true, destacado: true, vistas: true, createdAt: true },
        }),
        prisma.bibliotecaFavorito.findMany({
            where: { expediente: session.expediente },
            select: { bibliotecaId: true },
        }),
    ]);

    const favIds = new Set(favoritos.map(f => f.bibliotecaId));
    const data = items.map(item => ({ ...item, esFavorito: favIds.has(item.id) }));
    return NextResponse.json(data);
}
