import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { crearNotificacion } from "@/lib/notificaciones";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const { estado, observacion } = await req.json();

    const pedido = await prisma.pedido.update({
        where: { id: parseInt(id) },
        data: {
            ...(estado !== undefined && { estado }),
            ...(observacion !== undefined && { observacion }),
        },
        include: { producto: { select: { nombre: true } } },
    });

    if (estado === "aprobado") {
        await crearNotificacion(
            pedido.expediente,
            "Pedido aprobado",
            `Tu pedido de "${pedido.producto.nombre}" fue aprobado y está listo para retirar.`,
            "pedido"
        );
    } else if (estado === "entregado") {
        await crearNotificacion(
            pedido.expediente,
            "Pedido entregado",
            `Tu pedido de "${pedido.producto.nombre}" fue entregado. ¡Gracias!`,
            "pedido"
        );
    } else if (estado === "cancelado") {
        await crearNotificacion(
            pedido.expediente,
            "Pedido cancelado",
            `Tu pedido de "${pedido.producto.nombre}" fue cancelado.`,
            "pedido"
        );
    }

    return NextResponse.json(pedido);
}
