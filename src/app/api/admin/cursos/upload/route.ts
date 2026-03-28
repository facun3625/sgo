import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || (session.accessLevel !== "superadmin" && session.accessLevel !== "admin")) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No se encontró el archivo" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = join(process.cwd(), "public", "uploads", "cursos");
    await mkdir(uploadDir, { recursive: true });

    const ext = file.name.split(".").pop();
    const filename = `curso-${Date.now()}.${ext}`;
    await writeFile(join(uploadDir, filename), buffer);

    return NextResponse.json({ url: `/uploads/cursos/${filename}` });
}
