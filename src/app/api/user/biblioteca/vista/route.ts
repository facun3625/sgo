import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await getSession();
    if (!session?.expediente) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { bibliotecaId } = await req.json();
    await prisma.biblioteca.update({
        where: { id: bibliotecaId },
        data: { vistas: { increment: 1 } },
    });
    return NextResponse.json({ ok: true });
}
