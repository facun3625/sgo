import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const productos = await prisma.producto.findMany({
        orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(productos);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { nombre, precio, stock, habilitado, limiteMensual } = await req.json();

    if (!nombre || precio == null || stock == null) {
        return NextResponse.json({ error: "nombre, precio y stock son obligatorios" }, { status: 400 });
    }

    const producto = await prisma.producto.create({
        data: {
            nombre,
            precio: parseFloat(precio),
            stock: parseInt(stock),
            habilitado: habilitado ?? true,
            limiteMensual: limiteMensual ? parseInt(limiteMensual) : null,
        },
    });

    return NextResponse.json(producto);
}
