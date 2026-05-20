import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

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

    const rows = pedidos.map((p) => {
        const u = userMap.get(p.expediente);
        return {
            ID: p.id,
            Expediente: p.expediente,
            Nombre: u?.nombre ?? "",
            Apellido: u?.apellido ?? "",
            Producto: p.producto.nombre,
            Cantidad: p.cantidad,
            "Método de Pago": p.metodoPago,
            Estado: p.estado,
            Fecha: new Date(p.createdAt).toLocaleDateString("es-AR"),
        };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": 'attachment; filename="pedidos-ventas.xlsx"',
        },
    });
}
