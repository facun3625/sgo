export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");
    const estado = searchParams.get("estado");

    const where: Record<string, any> = {};
    if (tipo) where.tipo = { contains: tipo, mode: "insensitive" };
    if (estado) where.estado = estado;

    const solicitudes = await prisma.solicitud.findMany({
        where,
        orderBy: { fecha: "desc" },
    });

    if (solicitudes.length === 0) return NextResponse.json([]);

    // Get unique expedientes to join user names
    const expedientes = [...new Set(solicitudes.map((s) => s.expediente))];
    const users = await prisma.user.findMany({
        where: { expediente: { in: expedientes } },
        select: { expediente: true, nombre: true, apellido: true },
    });

    const userMap = new Map(users.map((u) => [u.expediente, u]));

    const result = solicitudes.map((s) => {
        const user = userMap.get(s.expediente);
        return {
            ...s,
            nombre: user?.nombre ?? null,
            apellido: user?.apellido ?? null,
        };
    });

    return NextResponse.json(result);
}
