import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { bibliotecaId } = await req.json();

    const existing = await prisma.bibliotecaFavorito.findUnique({
        where: { expediente_bibliotecaId: { expediente: session.expediente, bibliotecaId } },
    });

    if (existing) {
        await prisma.bibliotecaFavorito.delete({ where: { id: existing.id } });
        return NextResponse.json({ favorito: false });
    } else {
        await prisma.bibliotecaFavorito.create({
            data: { expediente: session.expediente, bibliotecaId },
        });
        return NextResponse.json({ favorito: true });
    }
}
