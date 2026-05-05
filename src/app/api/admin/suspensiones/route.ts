export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const expediente = searchParams.get("expediente");
    const tipo = searchParams.get("tipo"); // "historial" | "rehabilitaciones" | null (ambos)

    const where = expediente ? { expediente } : {};

    if (tipo === "rehabilitaciones") {
        // Traer solicitudes con info del usuario desde datos
        const solicitudes = await prisma.solicitudRehabilitacion.findMany({
            orderBy: { createdAt: "desc" },
        });

        // Enriquecer con nombre desde datos
        const expedientes = [...new Set(solicitudes.map(s => s.expediente))];
        const datosList = await prisma.dato.findMany({
            where: { expediente: { in: expedientes } },
            select: { expediente: true, nombre: true, apellido: true },
        });
        const datosMap = new Map(datosList.map(d => [d.expediente!, { nombre: d.nombre, apellido: d.apellido }]));

        const result = solicitudes.map(s => ({
            ...s,
            nombre: datosMap.get(s.expediente)?.nombre ?? s.expediente,
            apellido: datosMap.get(s.expediente)?.apellido ?? "",
        }));

        return NextResponse.json({ solicitudes: result });
    }

    const registros = await prisma.historialMatricula.findMany({
        where,
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ registros });
}
