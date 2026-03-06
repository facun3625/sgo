import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const datos = await prisma.dato.findFirst({
            where: { expediente: session.expediente }
        });

        if (!datos) {
            return NextResponse.json({ error: "Datos no encontrados" }, { status: 404 });
        }

        return NextResponse.json(datos);
    } catch (error) {
        console.error("Error al obtener datos:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await request.json();

        // Campos prohibidos para edición por seguridad
        const sensitiveFields = [
            "id", "cod", "nombre", "apellido", "expediente",
            "folio", "tomo", "documento", "fechaMatriculacion",
            "createdAt", "updatedAt"
        ];

        // Limpiar el body de campos sensibles
        const updateData = { ...body };
        sensitiveFields.forEach(field => delete updateData[field]);

        const updated = await prisma.dato.updateMany({
            where: { expediente: session.expediente },
            data: updateData
        });

        if (updated.count === 0) {
            return NextResponse.json({ error: "No se encontró el registro para actualizar" }, { status: 404 });
        }

        return NextResponse.json({ message: "Datos actualizados correctamente" });
    } catch (error) {
        console.error("Error al actualizar datos:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
