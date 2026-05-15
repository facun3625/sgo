import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session || !["admin", "superadmin"].includes(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const numId = Number(id);
    if (isNaN(numId)) {
        return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    try {
        await prisma.fiador.delete({ where: { id: numId } });
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
}
