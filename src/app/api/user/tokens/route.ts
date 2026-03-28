import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const config = await prisma.tokenConfig.findUnique({ where: { id: 1 } });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const pedidosMesCount = await prisma.tokenPedido.count({
        where: {
            expediente: session.expediente,
            estado: { not: "cancelado" },
            createdAt: { gte: startOfMonth },
        },
    });

    const pedidos = await prisma.tokenPedido.findMany({
        where: { expediente: session.expediente },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ config, pedidosMes: pedidosMesCount, pedidos });
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que el usuario está matriculado
    const user = await prisma.user.findUnique({
        where: { expediente: session.expediente },
    });
    if (!user || user.accessLevel !== "user") {
        return NextResponse.json({ error: "Usuario no matriculado" }, { status: 403 });
    }

    const config = await prisma.tokenConfig.findUnique({ where: { id: 1 } });
    if (!config || !config.activo) {
        return NextResponse.json({ error: "Venta de tokens no disponible" }, { status: 400 });
    }

    const { cantidad, metodoPago, comprobante } = await req.json();

    if (!cantidad || cantidad < 1) {
        return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 });
    }

    if (config.stock < cantidad) {
        return NextResponse.json({ error: "Stock insuficiente" }, { status: 400 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const pedidosMes = await prisma.tokenPedido.count({
        where: {
            expediente: session.expediente,
            estado: { not: "cancelado" },
            createdAt: { gte: startOfMonth },
        },
    });

    if (pedidosMes + cantidad > config.limiteMensual) {
        return NextResponse.json(
            { error: `Superás el límite mensual de ${config.limiteMensual} token(s)` },
            { status: 400 }
        );
    }

    const pedido = await prisma.tokenPedido.create({
        data: {
            expediente: session.expediente,
            cantidad,
            metodoPago,
            comprobante: comprobante ?? null,
        },
    });

    await prisma.tokenConfig.update({
        where: { id: 1 },
        data: { stock: { decrement: cantidad } },
    });

    return NextResponse.json(pedido);
}
