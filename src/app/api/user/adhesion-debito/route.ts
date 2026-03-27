import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const formData = await request.formData();
        const tipoAdhesion = formData.get("tipoAdhesion") as string;
        const terminosAceptados = formData.get("terminosAceptados") === "true";

        if (!terminosAceptados) {
            return NextResponse.json({ error: "Debe aceptar los términos y condiciones" }, { status: 400 });
        }

        const uploadDir = join(process.cwd(), "public/uploads/adhesiones");

        // Función para guardar archivos
        const saveFile = async (file: File | null, prefix: string) => {
            if (!file || file.size === 0) return null;
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const fileName = `${Date.now()}_${prefix}_${file.name.replace(/\s+/g, '_')}`;
            const path = join(uploadDir, fileName);
            await writeFile(path, buffer);
            return `/uploads/adhesiones/${fileName}`;
        };

        const dniFile = formData.get("dniFrontal") as File;
        const constanciaCbuFile = formData.get("constanciaCbu") as File;
        const frontalTarjetaFile = formData.get("frontalTarjeta") as File;

        const dniFrontalPath = await saveFile(dniFile, "dni");
        const constanciaCbuPath = await saveFile(constanciaCbuFile, "cbu");
        const frontalTarjetaPath = await saveFile(frontalTarjetaFile, "tarjeta");

        const nuevaAdhesion = await prisma.adhesionDebito.create({
            data: {
                expediente: session.expediente || "",
                tipoAdhesion,
                estado: "pendiente",
                dniFrontal: dniFrontalPath,
                constanciaCbu: constanciaCbuPath,
                frontalTarjeta: frontalTarjetaPath,
                terminosAceptados: true
            }
        });

        return NextResponse.json(nuevaAdhesion);
    } catch (error) {
        console.error("CRITICAL API ERROR:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Error interno del servidor",
            stack: error instanceof Error ? error.stack : undefined,
            prismaError: error
        }, { status: 500 });
    }
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const adhesiones = await prisma.adhesionDebito.findMany({
            where: { expediente: session.expediente },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(adhesiones);
    } catch (error) {
        console.error("Error al obtener adhesiones:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
