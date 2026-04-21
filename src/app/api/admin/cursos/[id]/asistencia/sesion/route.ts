import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

// POST: crear nueva sesión de asistencia
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const cursoId = parseInt(id);
    const body = await req.json();
    const { diaId } = body; // null para global

    // Cerrar cualquier sesión activa del mismo curso (y mismo día si aplica)
    await prisma.sesionAsistencia.updateMany({
        where: { cursoId, activa: true, diaId: diaId ?? null },
        data: { activa: false },
    });

    const sesion = await prisma.sesionAsistencia.create({
        data: {
            cursoId,
            diaId: diaId ?? null,
            activa: true,
        },
        include: { asistencias: true },
    });

    return NextResponse.json(sesion);
}
