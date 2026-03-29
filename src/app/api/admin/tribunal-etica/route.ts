export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const expediente = searchParams.get("expediente");

    try {
        const registros = await prisma.tribunalEtica.findMany({
            where: expediente ? { expediente } : undefined,
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(registros);
    } catch (e: any) {
        if (e?.code === "P2021") return NextResponse.json({ error: "Tabla no existe. Corré: npx prisma db push" }, { status: 503 });
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { expediente, texto, inicio, fin } = await req.json();
    if (!expediente?.trim() || !texto?.trim() || !inicio || !fin) {
        return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
    }

    const registro = await prisma.tribunalEtica.create({
        data: {
            expediente: expediente.trim(),
            texto: texto.trim(),
            inicio: new Date(inicio),
            fin: new Date(fin),
        },
    });
    return NextResponse.json(registro);
}

export async function PATCH(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id, expediente, texto, inicio, fin } = await req.json();
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const updated = await prisma.tribunalEtica.update({
        where: { id },
        data: {
            ...(expediente !== undefined && { expediente: expediente.trim() }),
            ...(texto !== undefined && { texto: texto.trim() }),
            ...(inicio !== undefined && { inicio: new Date(inicio) }),
            ...(fin !== undefined && { fin: new Date(fin) }),
        },
    });
    return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await req.json();
    await prisma.tribunalEtica.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
