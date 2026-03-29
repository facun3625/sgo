export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const adhesiones = await prisma.adhesionDebito.findMany({
        orderBy: { createdAt: "desc" },
    });

    if (adhesiones.length === 0) return NextResponse.json([]);

    const expedientes = [...new Set(adhesiones.map((a) => a.expediente))];
    const users = await prisma.user.findMany({
        where: { expediente: { in: expedientes } },
        select: { expediente: true, nombre: true, apellido: true },
    });

    const userMap = new Map(users.map((u) => [u.expediente, u]));

    const result = adhesiones.map((a) => ({
        ...a,
        nombre: userMap.get(a.expediente)?.nombre ?? null,
        apellido: userMap.get(a.expediente)?.apellido ?? null,
    }));

    return NextResponse.json(result);
}
