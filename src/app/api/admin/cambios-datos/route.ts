export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const soloNoLeidos = searchParams.get("soloNoLeidos") === "true";

    const where = soloNoLeidos ? { leido: false } : {};

    const [total, cambios] = await Promise.all([
        prisma.cambioDatos.count({ where }),
        prisma.cambioDatos.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
    ]);

    const expedientes = [...new Set(cambios.map((c) => c.expediente))];
    const users = await prisma.user.findMany({
        where: { expediente: { in: expedientes } },
        select: { expediente: true, nombre: true, apellido: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.expediente, u]));

    const data = cambios.map((c) => ({
        ...c,
        usuario: userMap[c.expediente] ?? null,
    }));

    const sinLeer = await prisma.cambioDatos.count({ where: { leido: false } });

    return NextResponse.json({
        data,
        total,
        sinLeer,
        pages: Math.ceil(total / PAGE_SIZE),
        page,
    });
}

// PATCH bulk: marcar leído/no-leído varios ids
export async function PATCH(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { ids, leido } = await req.json() as { ids: number[]; leido: boolean };
    if (!Array.isArray(ids) || ids.length === 0)
        return NextResponse.json({ error: "ids requeridos" }, { status: 400 });

    await prisma.cambioDatos.updateMany({ where: { id: { in: ids } }, data: { leido } });
    return NextResponse.json({ ok: true });
}
