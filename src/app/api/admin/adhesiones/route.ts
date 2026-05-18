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

    const [users, datos] = await Promise.all([
        prisma.user.findMany({
            where: { expediente: { in: expedientes } },
            select: { expediente: true, nombre: true, apellido: true },
        }),
        prisma.dato.findMany({
            where: { expediente: { in: expedientes } },
            select: { expediente: true, nombre: true, apellido: true },
        }),
    ]);

    const nameMap = new Map<string, { nombre: string; apellido: string }>();
    for (const d of datos) if (d.expediente) nameMap.set(d.expediente, d);
    for (const u of users) if (u.expediente) nameMap.set(u.expediente, u);

    const result = adhesiones.map((a) => ({
        ...a,
        nombre: nameMap.get(a.expediente)?.nombre ?? null,
        apellido: nameMap.get(a.expediente)?.apellido ?? null,
    }));

    return NextResponse.json(result);
}
