import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const DOC_EXT = [".doc", ".docx"];

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const ext = path.extname(file.name).toLowerCase();
    const tipo = IMAGE_EXT.includes(ext) ? "imagen" : ext === ".pdf" ? "pdf" : DOC_EXT.includes(ext) ? "doc" : null;
    if (!tipo) return NextResponse.json({ error: "Formato no soportado. Usá imagen, PDF o Word." }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "envios");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);

    return NextResponse.json({ url: `/uploads/envios/${fileName}`, tipo });
}
