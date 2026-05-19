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
    const q = searchParams.get("q")?.trim() ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = 20;
    const skip = (page - 1) * limit;

    const where: any = {
        accessLevel: { notIn: ["admin", "superadmin"] },
    };

    if (q) {
        where.OR = [
            { expediente: { contains: q } },
            { nombre: { contains: q, mode: "insensitive" } },
            { apellido: { contains: q, mode: "insensitive" } },
            // "apellido, nombre" o "nombre apellido"
            { AND: [
                { apellido: { contains: q.split(/,\s*/)[0]?.trim(), mode: "insensitive" } },
                { nombre: { contains: (q.split(/,\s*/)[1] ?? "").trim(), mode: "insensitive" } },
            ]},
        ];
    }

    const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            select: {
                id: true,
                expediente: true,
                nombre: true,
                apellido: true,
                status: true,
                createdAt: true,
            },
            orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
            skip,
            take: limit,
        }),
    ]);

    // Enriquecer con email y estado CATASTRO
    const expedientes = users.map(u => u.expediente).filter(Boolean) as string[];
    const [datos, solicitudesCatastro] = await Promise.all([
        prisma.dato.findMany({
            where: { expediente: { in: expedientes } },
            select: { expediente: true, emailLegal: true },
        }),
        prisma.solicitud.findMany({
            where: {
                expediente: { in: expedientes },
                estado: "completada",
                AND: [
                    { OR: [{ tipo: { contains: "CATASTRO" } }, { tipo: { contains: "SIGIT" } }] },
                    { NOT: { tipo: { contains: "Baja" } } },
                ],
            },
            select: { expediente: true },
        }),
    ]);
    const emailMap = new Map(datos.map(d => [d.expediente, d.emailLegal]));
    const catastroSet = new Set(solicitudesCatastro.map(s => s.expediente));

    const result = users.map(u => ({
        ...u,
        email: u.expediente ? (emailMap.get(u.expediente) ?? null) : null,
        catastroActivo: u.expediente ? catastroSet.has(u.expediente) : false,
    }));

    return NextResponse.json({ users: result, total, page, pages: Math.ceil(total / limit) });
}
