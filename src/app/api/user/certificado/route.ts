import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { presentarAnte, emailLegal, detalles } = body;

    const solicitud = await prisma.solicitud.create({
        data: {
            expediente: session.expediente || "",
            tipo: "Certificado de Matriculación",
            presentarAnte: presentarAnte || null,
            emailLegal: emailLegal || null,
            detalles: detalles || {},
            estado: "completada",
        }
    });

    return NextResponse.json(solicitud);
}

export async function PATCH(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const formData = await req.formData();
    const id = parseInt(formData.get("id") as string);
    const file = formData.get("pdf") as File;

    if (!file || !id) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = join(process.cwd(), "public", "uploads", "certificados");
    await mkdir(uploadDir, { recursive: true });

    const filename = `certificado-${session.expediente}-${id}.pdf`;
    await writeFile(join(uploadDir, filename), buffer);

    await prisma.solicitud.update({
        where: { id },
        data: { adjunto: `/uploads/certificados/${filename}` }
    });

    return NextResponse.json({ success: true });
}
