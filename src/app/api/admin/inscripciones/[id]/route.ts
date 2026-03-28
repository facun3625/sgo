import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const { estado } = await req.json();

    const updated = await prisma.inscripcionCurso.update({
        where: { id: parseInt(id) },
        data: { estado },
    });

    return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Decrementar inscritos en la opción
    const insc = await prisma.inscripcionCurso.findUnique({
        where: { id: parseInt(id) },
        select: { opcionId: true },
    });

    await prisma.inscripcionCurso.delete({ where: { id: parseInt(id) } });

    if (insc?.opcionId) {
        await prisma.cursoOpcion.update({
            where: { id: insc.opcionId },
            data: { inscritos: { decrement: 1 } },
        });
    }

    return NextResponse.json({ success: true });
}
