import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const pedido = await prisma.tokenPedido.findUnique({
        where: { id: parseInt(id) },
    });

    if (!pedido) {
        return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (pedido.expediente !== session.expediente) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (pedido.estado !== "pendiente") {
        return NextResponse.json({ error: "Solo se pueden cancelar pedidos pendientes" }, { status: 400 });
    }

    await prisma.tokenPedido.update({
        where: { id: parseInt(id) },
        data: { estado: "cancelado" },
    });

    // Restaurar stock
    await prisma.tokenConfig.update({
        where: { id: 1 },
        data: { stock: { increment: pedido.cantidad } },
    });

    return NextResponse.json({ success: true });
}
