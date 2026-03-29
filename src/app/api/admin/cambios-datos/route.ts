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

    const cambios = await prisma.cambioDatos.findMany({
        orderBy: { createdAt: "desc" },
    });

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

    return NextResponse.json(data);
}
