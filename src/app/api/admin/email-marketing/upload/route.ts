import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://sgo-casf.online";

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const ext = path.extname(file.name).toLowerCase();
    if (!IMAGE_EXT.includes(ext)) {
        return NextResponse.json({ error: "Formato no soportado. Usá una imagen (jpg, png, gif, webp)." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "email-marketing");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);

    // URL absoluta: esta imagen va incrustada en el HTML del mail, que se abre
    // fuera del dominio de la app, así que una ruta relativa no resolvería.
    return NextResponse.json({ url: `${BASE_URL}/uploads/email-marketing/${fileName}` });
}
