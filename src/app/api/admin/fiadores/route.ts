import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PUT /api/admin/fiadores — asigna o reemplaza fiador de un expediente
export async function PUT(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "superadmin"].includes(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { expediente, fiadorExpediente } = await req.json();

    if (!expediente || !fiadorExpediente) {
        return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }
    if (expediente === fiadorExpediente) {
        return NextResponse.json({ error: "Un matriculado no puede ser su propio fiador" }, { status: 400 });
    }

    const fiador = await prisma.fiador.upsert({
        where: { expediente },
        update: { fiadorExpediente },
        create: { expediente, fiadorExpediente },
    });

    // Buscar datos del fiador para devolver en la respuesta
    const dato = await prisma.dato.findFirst({
        where: { expediente: fiadorExpediente },
        select: { apellido: true, nombre: true },
    });

    return NextResponse.json({
        id: fiador.id,
        expediente: fiadorExpediente,
        apellido: dato?.apellido ?? null,
        nombre: dato?.nombre ?? null,
    });
}
