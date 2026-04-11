import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.nombre !== undefined) data.nombre = body.nombre;
    if (body.precio !== undefined) data.precio = parseFloat(body.precio);
    if (body.stock !== undefined) data.stock = parseInt(body.stock);
    if (body.habilitado !== undefined) data.habilitado = body.habilitado;
    if (body.limiteMensual !== undefined) {
        data.limiteMensual = body.limiteMensual ? parseInt(body.limiteMensual) : null;
    }

    const producto = await prisma.producto.update({
        where: { id: parseInt(id) },
        data,
    });

    return NextResponse.json(producto);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.producto.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
}
