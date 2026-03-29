export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const updated = await prisma.cambioDatos.update({
        where: { id },
        data: { leido: true },
    });

    return NextResponse.json(updated);
}
