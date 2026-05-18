export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const expediente = searchParams.get("expediente")?.trim() || null;
    const adminId = searchParams.get("adminId") ? parseInt(searchParams.get("adminId")!) : null;
    const modulo = searchParams.get("modulo")?.trim() || null;
    const accion = searchParams.get("accion")?.trim() || null;
    const desde = searchParams.get("desde") || null;
    const hasta = searchParams.get("hasta") || null;
    const page = parseInt(searchParams.get("page") || "0");
    const limit = 50;

    const where: Record<string, unknown> = {};
    if (expediente) where.expediente = { contains: expediente, mode: "insensitive" };
    if (adminId) where.adminId = adminId;
    if (modulo) where.modulo = modulo;
    if (accion) where.accion = { contains: accion, mode: "insensitive" };
    if (desde || hasta) {
        where.createdAt = {
            ...(desde ? { gte: new Date(desde) } : {}),
            ...(hasta ? { lte: new Date(hasta + "T23:59:59") } : {}),
        };
    }

    const [logs, total, admins] = await Promise.all([
        prisma.adminLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: page * limit,
            take: limit,
        }),
        prisma.adminLog.count({ where }),
        prisma.adminLog.findMany({
            distinct: ["adminId"],
            select: { adminId: true, adminNombre: true },
            orderBy: { adminNombre: "asc" },
        }),
    ]);

    const modulos = await prisma.adminLog.findMany({
        distinct: ["modulo"],
        select: { modulo: true },
        orderBy: { modulo: "asc" },
    });

    return NextResponse.json({ logs, total, pages: Math.ceil(total / limit), admins, modulos: modulos.map(m => m.modulo) });
}
