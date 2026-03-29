import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { ids } = await req.json() as { ids: number[] };
    await Promise.all(ids.map((id, idx) => prisma.firmaAutoridad.update({ where: { id }, data: { orden: idx } })));
    return NextResponse.json({ ok: true });
}
