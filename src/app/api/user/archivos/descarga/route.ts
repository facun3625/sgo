import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await req.json();
    await prisma.repositorioArchivo.update({
        where: { id: parseInt(id) },
        data: { descargas: { increment: 1 } },
    });
    return NextResponse.json({ ok: true });
}
