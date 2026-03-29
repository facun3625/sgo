export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile } from "fs/promises";
import path from "path";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const cargo = form.get("cargo") as string | null;

    if (!file || !cargo) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["png", "jpg", "jpeg", "svg", "webp"].includes(ext || "")) {
        return NextResponse.json({ error: "Solo se permiten imágenes PNG, JPG o SVG" }, { status: 400 });
    }

    const filename = `firma-${cargo}-${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();
    const uploadDir = path.join(process.cwd(), "public", "uploads", "firmas");

    const { mkdir } = await import("fs/promises");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));

    return NextResponse.json({ url: `/uploads/firmas/${filename}` });
}
