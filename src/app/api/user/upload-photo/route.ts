// Photo Upload Handler (Types refreshed)
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile } from "fs/promises";
import path from "path";

export async function DELETE() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await prisma.user.update({
        where: { expediente: session.expediente },
        data: { image: null },
    });

    return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No se encontró el archivo" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const fileExt = path.extname(file.name) || ".jpg";
        const filename = `${session.expediente}-${Date.now()}${fileExt}`;
        const uploadDir = path.join(process.cwd(), "public", "uploads", "profiles");
        const relativePath = `/uploads/profiles/${filename}`;
        const finalPath = path.join(uploadDir, filename);

        await writeFile(finalPath, buffer);

        // Actualizar base de datos
        await prisma.user.update({
            where: { expediente: session.expediente },
            data: { image: relativePath }
        });

        return NextResponse.json({ url: relativePath });
    } catch (error: any) {
        console.error("DEBUG ERROR UPLOAD:", error);
        return NextResponse.json({
            error: `Error técnico: ${error.message}`,
            stack: error.stack
        }, { status: 500 });
    }
}
