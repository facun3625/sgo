import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function POST() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await prisma.mensajeChat.updateMany({
        where: { de: "user", leido: false },
        data: { leido: true },
    });

    return NextResponse.json({ ok: true });
}
