import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No se subió ningún archivo" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Crear directorio si no existe
        const uploadDir = path.join(process.cwd(), "public", "uploads", "signatures");
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            console.error("Error al crear directorio:", e);
        }

        // Nombre de archivo único: expediente-timestamp
        const ext = path.extname(file.name) || ".png";
        const filename = `${session.expediente}-${Date.now()}${ext}`;
        const finalPath = path.join(uploadDir, filename);

        await writeFile(finalPath, buffer);

        // Actualizar base de datos
        const signatureUrl = `/uploads/signatures/${filename}`;
        await prisma.user.update({
            where: { expediente: session.expediente },
            data: { signature: signatureUrl }
        });

        return NextResponse.json({ success: true, url: signatureUrl });

    } catch (error: any) {
        console.error("Error al procesar la firma:", error);
        return NextResponse.json({
            error: "Error interno del servidor",
            details: error.message
        }, { status: 500 });
    }
}
