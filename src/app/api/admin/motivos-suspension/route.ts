import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const motivos = await prisma.motivoSuspension.findMany({
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(motivos);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { nombre, tipo, aplicaMulta } = await req.json();
    if (!nombre?.trim()) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    if (!["suspension", "cancelacion", "ambos"].includes(tipo))
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });

    const motivo = await prisma.motivoSuspension.create({
        data: { nombre: nombre.trim(), tipo, aplicaMulta: !!aplicaMulta },
    });
    return NextResponse.json(motivo, { status: 201 });
}
