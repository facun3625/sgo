export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const tutoriales = await prisma.tutorial.findMany({
        where: { activo: true },
        orderBy: { orden: "asc" },
        select: { id: true, titulo: true, descripcion: true, videoUrl: true, tipo: true },
    });

    return NextResponse.json(tutoriales);
}
