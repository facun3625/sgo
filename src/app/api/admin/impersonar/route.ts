import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || session.accessLevel !== "superadmin")
        return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return NextResponse.json([]);

    const tipo = req.nextUrl.searchParams.get("tipo") ?? "user";
    const accessLevel = tipo === "admin" ? "admin" : "user";

    const users = await prisma.user.findMany({
        where: {
            accessLevel,
            OR: [
                { expediente: { contains: q } },
                { apellido: { contains: q, mode: "insensitive" } },
                { nombre: { contains: q, mode: "insensitive" } },
                { cod: { contains: q } },
            ],
        },
        select: { id: true, expediente: true, nombre: true, apellido: true, cod: true, status: true },
        orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
        take: 20,
    });

    return NextResponse.json(users);
}
