import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const filename = `repo_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "repositorio");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    // Detect tipo
    const tipoMap: Record<string, string> = {
        pdf: "pdf", doc: "doc", docx: "doc",
        xls: "xls", xlsx: "xls", ppt: "ppt", pptx: "ppt",
        jpg: "img", jpeg: "img", png: "img", gif: "img", webp: "img",
        zip: "zip", rar: "zip",
    };
    const tipo = tipoMap[ext] || "otro";

    // Human-readable size
    const size = file.size;
    const tamano = size < 1024 ? `${size} B`
        : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB`
        : `${(size / (1024 * 1024)).toFixed(1)} MB`;

    return NextResponse.json({ url: `/uploads/repositorio/${filename}`, tipo, tamano });
}
