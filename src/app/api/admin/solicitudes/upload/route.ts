export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const formData = await req.formData();
    const id = formData.get("id") as string;
    const file = formData.get("file") as File | null;

    if (!id || !file) {
        return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `juris-resp-${id}-${Date.now()}.pdf`;
    const dir = path.join(process.cwd(), "public", "uploads", "respuestas", "jurisprudencia");

    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buffer);

    const url = `/uploads/respuestas/jurisprudencia/${filename}`;
    return NextResponse.json({ url });
}
