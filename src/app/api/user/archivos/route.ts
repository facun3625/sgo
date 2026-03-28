export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const cats = await prisma.repositorioCategoria.findMany({
        orderBy: { orden: "asc" },
        include: {
            archivos: {
                orderBy: { createdAt: "asc" },
                select: { id: true, nombre: true, descripcion: true, archivo: true, tipo: true, tamano: true, descargas: true, createdAt: true },
            },
        },
    });
    return NextResponse.json(cats);
}
