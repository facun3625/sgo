import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado");

    const where = estado ? { estado } : {};

    const pedidos = await prisma.tokenPedido.findMany({
        where,
        orderBy: { createdAt: "desc" },
    });

    // Join con usuario por expediente
    const expedientes = [...new Set(pedidos.map((p) => p.expediente))];
    const users = await prisma.user.findMany({
        where: { expediente: { in: expedientes } },
        select: { expediente: true, nombre: true, apellido: true },
    });

    const userMap = new Map(users.map((u) => [u.expediente, u]));

    const result = pedidos.map((p) => ({
        ...p,
        usuario: userMap.get(p.expediente) ?? null,
    }));

    return NextResponse.json(result);
}
