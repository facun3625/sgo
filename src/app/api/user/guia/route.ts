export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return NextResponse.json([]);

    const datos = await prisma.dato.findMany({
        where: {
            OR: [
                { apellido: { contains: q, mode: "insensitive" } },
                { expediente: { contains: q } },
            ],
        },
        select: {
            nombre: true,
            apellido: true,
            expediente: true,
            telefonosLegal: true,
            movilLegal: true,
            emailLegal: true,
        },
        orderBy: { apellido: "asc" },
        take: 30,
    });

    const expedientes = datos.map(d => d.expediente).filter(Boolean) as string[];
    const users = expedientes.length
        ? await prisma.user.findMany({
            where: { expediente: { in: expedientes } },
            select: { expediente: true, image: true },
        })
        : [];
    const imageMap = new Map(users.map(u => [u.expediente, u.image]));

    return NextResponse.json(datos.map(d => ({
        ...d,
        image: d.expediente ? (imageMap.get(d.expediente) ?? null) : null,
    })));
}
