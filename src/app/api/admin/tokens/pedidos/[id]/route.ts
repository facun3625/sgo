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

    const pedido = await prisma.tokenPedido.update({
        where: { id: parseInt(id) },
        data: {
            ...(estado !== undefined && { estado }),
            ...(observacion !== undefined && { observacion }),
        },
    });

    // Notificaciones según nuevo estado
    if (estado === "aprobado") {
        await crearNotificacion(
            pedido.expediente,
            "Pedido de token aprobado",
            "Tu pedido de token fue aprobado y está listo para retirar.",
            "pedido"
        );
    } else if (estado === "entregado") {
        await crearNotificacion(
            pedido.expediente,
            "Token entregado",
            "Tu token ha sido entregado. ¡Gracias!",
            "pedido"
        );
    } else if (estado === "cancelado") {
        await crearNotificacion(
            pedido.expediente,
            "Pedido cancelado",
            "Tu pedido de token fue cancelado.",
            "pedido"
        );
    }

    return NextResponse.json(pedido);
}
