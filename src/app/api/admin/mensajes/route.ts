export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const convs = await prisma.conversacion.findMany({
        where: { archivada: false },
        orderBy: { updatedAt: "desc" },
        include: {
            mensajes: {
                orderBy: { createdAt: "desc" },
                take: 1,
            },
            _count: { select: { mensajes: { where: { de: "user", leido: false } } } },
        },
    });

    // Enrich with user name from datos
    const expedientes = [...new Set(convs.map(c => c.expediente))];
    const datos = await prisma.dato.findMany({
        where: { OR: expedientes.map(e => ({ expediente: e })).concat(expedientes.map(e => ({ cod: e }))) },
        select: { expediente: true, cod: true, nombre: true, apellido: true },
    });
    const datoMap = new Map(datos.map(d => [d.expediente || d.cod, d]));

    const result = convs.map(c => ({
        id: c.id,
        expediente: c.expediente,
        asunto: c.asunto,
        ultimoMensaje: c.mensajes[0] ?? null,
        unreadAdmin: c._count.mensajes,
        updatedAt: c.updatedAt,
        usuario: datoMap.get(c.expediente) ?? null,
    }));

    return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { expediente, asunto, contenido } = await req.json();
    if (!expediente || !asunto?.trim() || !contenido?.trim()) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    const conv = await prisma.conversacion.create({
        data: {
            expediente,
            asunto: asunto.trim(),
            mensajes: { create: { de: "admin", contenido: contenido.trim() } },
        },
        include: { mensajes: true },
    });

    return NextResponse.json(conv);
}
