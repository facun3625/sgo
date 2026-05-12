export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const tutoriales = await prisma.tutorial.findMany({
        orderBy: { orden: "asc" },
    });

    return NextResponse.json(tutoriales);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { titulo, descripcion, videoUrl, tipo } = await req.json();
    if (!titulo?.trim() || !videoUrl?.trim()) {
        return NextResponse.json({ error: "Título y video son requeridos" }, { status: 400 });
    }

    const last = await prisma.tutorial.findFirst({ orderBy: { orden: "desc" }, select: { orden: true } });

    const tutorial = await prisma.tutorial.create({
        data: {
            titulo: titulo.trim(),
            descripcion: descripcion?.trim() || null,
            videoUrl: videoUrl.trim(),
            tipo: tipo === "embed" ? "embed" : "url",
            orden: (last?.orden ?? -1) + 1,
        },
    });

    return NextResponse.json(tutorial);
}
