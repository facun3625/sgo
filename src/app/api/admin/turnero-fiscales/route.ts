export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const items = await prisma.turneroFiscal.findMany({ orderBy: { orden: "asc" } });
    return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const formData = await req.formData();
    const titulo = formData.get("titulo") as string;
    const file = formData.get("archivo") as File;

    if (!titulo?.trim()) return NextResponse.json({ error: "El título es requerido" }, { status: 400 });
    if (!file) return NextResponse.json({ error: "El archivo es requerido" }, { status: 400 });
    if (file.type !== "application/pdf") return NextResponse.json({ error: "Solo se permiten archivos PDF" }, { status: 400 });

    const uploadDir = path.join(process.cwd(), "public/uploads/fiscales");
    await mkdir(uploadDir, { recursive: true });

    const ext = ".pdf";
    const nombre = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}${ext.endsWith(".pdf") ? "" : ext}`;
    const bytes = await file.arrayBuffer();
    await writeFile(path.join(uploadDir, nombre), Buffer.from(bytes));

    const count = await prisma.turneroFiscal.count();
    const item = await prisma.turneroFiscal.create({
        data: { titulo: titulo.trim(), archivo: `/uploads/fiscales/${nombre}`, orden: count },
    });

    return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    await prisma.turneroFiscal.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
}
