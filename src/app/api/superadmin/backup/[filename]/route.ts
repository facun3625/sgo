import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readFile, unlink } from "fs/promises";
import path from "path";

const BACKUP_DIR = path.join(process.cwd(), "backups");

function isSuperAdmin(lvl: string) {
    return lvl === "superadmin";
}

function safeName(filename: string) {
    return /^backup_[\d\-T]+\.sql$/.test(filename);
}

// GET — descargar backup
export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { filename } = await params;
    if (!safeName(filename))
        return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });

    try {
        const filepath = path.join(BACKUP_DIR, filename);
        const buffer = await readFile(filepath);
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": buffer.length.toString(),
            },
        });
    } catch {
        return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }
}

// DELETE — eliminar backup
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { filename } = await params;
    if (!safeName(filename))
        return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });

    try {
        await unlink(path.join(BACKUP_DIR, filename));
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }
}
