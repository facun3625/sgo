import { NextResponse } from "next/server";
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

    const pedidos = await prisma.pedido.findMany({
        orderBy: { createdAt: "desc" },
        include: { producto: { select: { nombre: true } } },
    });

    const expedientes = [...new Set(pedidos.map((p) => p.expediente))];
    const users = await prisma.user.findMany({
        where: { expediente: { in: expedientes } },
        select: { expediente: true, nombre: true, apellido: true },
    });

    const userMap = new Map(users.map((u) => [u.expediente, u]));

    const header = "id,expediente,nombre,apellido,producto,cantidad,metodoPago,estado,createdAt\n";
    const rows = pedidos
        .map((p) => {
            const u = userMap.get(p.expediente);
            return [
                p.id,
                p.expediente,
                u?.nombre ?? "",
                u?.apellido ?? "",
                p.producto.nombre,
                p.cantidad,
                p.metodoPago,
                p.estado,
                p.createdAt.toISOString(),
            ]
                .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                .join(",");
        })
        .join("\n");

    const csv = header + rows;

    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="pedidos-ventas.csv"',
        },
    });
}
