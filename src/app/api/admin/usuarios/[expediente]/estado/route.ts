import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ expediente: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { expediente } = await params;
    const { status } = await req.json(); // "active" | "suspended"

    if (!["active", "suspended"].includes(status)) return NextResponse.json({ error: "Estado inválido" }, { status: 400 });

    // Buscar user por expediente o por cod
    const user = await prisma.user.findFirst({
        where: { OR: [{ expediente }, { cod: expediente }] },
    });

    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    await prisma.user.update({ where: { id: user.id }, data: { status } });
    return NextResponse.json({ ok: true, status });
}
