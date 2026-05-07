import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "superadmin"].includes(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const limit = 50;
    const search = sp.get("search")?.trim() ?? "";

    const where = search
        ? {
              OR: [
                  { expediente: { contains: search, mode: "insensitive" as const } },
                  { apellido: { contains: search, mode: "insensitive" as const } },
                  { nombre: { contains: search, mode: "insensitive" as const } },
                  { documento: { contains: search } },
              ],
          }
        : {};

    const [datos, total] = await Promise.all([
        prisma.dato.findMany({
            where,
            orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.dato.count({ where }),
    ]);

    const expedientes = datos.map((d) => d.expediente).filter(Boolean) as string[];
    const users =
        expedientes.length > 0
            ? await prisma.user.findMany({
                  where: { expediente: { in: expedientes } },
                  select: { expediente: true, status: true },
              })
            : [];
    const userMap = new Map(users.map((u) => [u.expediente, u.status]));

    const rows = datos.map((d) => ({
        ...d,
        status: d.expediente ? (userMap.get(d.expediente) ?? null) : null,
    }));

    return NextResponse.json({ rows, total, page, pages: Math.ceil(total / limit) });
}
