import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { paywayDisponibleParaSeccion } from "@/lib/payway";

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const [productos, pedidos, transferenciaConfig, paywayHabilitado] = await Promise.all([
        prisma.producto.findMany({
            where: { habilitado: true },
            orderBy: { createdAt: "asc" },
        }),
        prisma.pedido.findMany({
            where: { expediente: session.expediente },
            orderBy: { createdAt: "desc" },
            include: { producto: { select: { nombre: true } } },
        }),
        prisma.config.findUnique({ where: { clave: "transferencia_ventas" } }),
        paywayDisponibleParaSeccion("ventas"),
    ]);

    // Para cada producto, contar pedidos del mes del usuario
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const pedidosMesPorProducto: Record<number, number> = {};
    for (const producto of productos) {
        pedidosMesPorProducto[producto.id] = await prisma.pedido.count({
            where: {
                expediente: session.expediente,
                productoId: producto.id,
                estado: { not: "cancelado" },
                createdAt: { gte: startOfMonth },
            },
        });
    }

    return NextResponse.json({
        productos,
        pedidos,
        pedidosMesPorProducto,
        transferenciaHabilitada: transferenciaConfig?.valor === "1",
        paywayHabilitado,
    });
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { expediente: session.expediente } });
    if (!user || user.accessLevel !== "user") {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { productoId, cantidad, metodoPago, comprobante } = await req.json();

    if (!productoId || !cantidad || cantidad < 1) {
        return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const producto = await prisma.producto.findUnique({ where: { id: productoId } });
    if (!producto || !producto.habilitado) {
        return NextResponse.json({ error: "Producto no disponible" }, { status: 400 });
    }

    if (producto.stock < cantidad) {
        return NextResponse.json({ error: "Stock insuficiente" }, { status: 400 });
    }

    if (producto.limiteMensual !== null) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const pedidosMes = await prisma.pedido.count({
            where: {
                expediente: session.expediente,
                productoId,
                estado: { not: "cancelado" },
                createdAt: { gte: startOfMonth },
            },
        });

        if (pedidosMes + cantidad > producto.limiteMensual) {
            return NextResponse.json(
                { error: `Superás el límite mensual de ${producto.limiteMensual} para este producto` },
                { status: 400 }
            );
        }
    }

    const pedido = await prisma.pedido.create({
        data: {
            expediente: session.expediente,
            productoId,
            cantidad,
            metodoPago,
            comprobante: comprobante ?? null,
        },
    });

    await prisma.producto.update({
        where: { id: productoId },
        data: { stock: { decrement: cantidad } },
    });

    return NextResponse.json(pedido);
}
