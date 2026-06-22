import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

function escapeCsv(val: string | null | undefined): string {
    if (val == null) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const cursoId = parseInt(id);

    const [curso, inscripciones] = await Promise.all([
        prisma.curso.findUnique({ where: { id: cursoId }, select: { titulo: true } }),
        prisma.inscripcionCurso.findMany({
            where: { cursoId },
            include: { opcion: true },
            orderBy: { fecha: "asc" },
        }),
    ]);

    if (!curso) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const expedientes = inscripciones.map(i => i.expediente).filter(Boolean);
    const usuarios = await prisma.user.findMany({
        where: { expediente: { in: expedientes } },
        select: { expediente: true, nombre: true, apellido: true },
    });
    const usuariosMap = new Map(usuarios.map(u => [u.expediente, u]));

    const estadoLabel: Record<string, string> = {
        confirmada: "Confirmada",
        pendiente_pago: "Pendiente de pago",
        cancelada: "Cancelada",
    };

    const header = ["Expediente", "Apellido", "Nombre", "Opción", "Estado", "Método de pago", "Fecha inscripción"];
    const rows = inscripciones.map(i => {
        const u = usuariosMap.get(i.expediente);
        return [
            escapeCsv(i.expediente),
            escapeCsv(u?.apellido),
            escapeCsv(u?.nombre),
            escapeCsv(i.opcion?.nombre),
            escapeCsv(estadoLabel[i.estado] ?? i.estado),
            escapeCsv(i.metodoPago),
            escapeCsv(new Date(i.fecha).toLocaleDateString("es-AR", { timeZone: "UTC" })),
        ].join(",");
    });

    const csv = [header.join(","), ...rows].join("\n");
    const filename = `inscriptos_${curso.titulo.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.csv`;

    return new NextResponse(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}
