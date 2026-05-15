import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { exec } from "child_process";
import { promisify } from "util";
import { mkdir, readdir, stat, writeFile } from "fs/promises";
import path from "path";

const execAsync = promisify(exec);
const BACKUP_DIR = path.join(process.cwd(), "backups");

function parseDbUrl(url: string) {
    const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:/]+):?(\d+)?\/([^?]+)/);
    if (!match) throw new Error("DATABASE_URL inválida");
    return { user: match[1], password: match[2], host: match[3], port: match[4] ?? "5432", db: match[5] };
}

function isSuperAdmin(lvl: string) {
    return lvl === "superadmin";
}

// GET — listar backups
export async function GET() {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    try {
        await mkdir(BACKUP_DIR, { recursive: true });
        const files = await readdir(BACKUP_DIR);
        const backups = await Promise.all(
            files
                .filter(f => f.endsWith(".sql"))
                .map(async f => {
                    const s = await stat(path.join(BACKUP_DIR, f));
                    return { filename: f, size: s.size, createdAt: s.birthtime.toISOString() };
                })
        );
        backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return NextResponse.json({ backups });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

// PUT — subir backup desde archivo
export async function PUT(req: NextRequest) {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    try {
        await mkdir(BACKUP_DIR, { recursive: true });
        const form = await req.formData();
        const file = form.get("file") as File | null;
        if (!file || !file.name.endsWith(".sql"))
            return NextResponse.json({ error: "Archivo inválido, debe ser .sql" }, { status: 400 });

        const now = new Date();
        const ts = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const filename = `backup_${ts}_subido.sql`;
        const filepath = path.join(BACKUP_DIR, filename);

        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filepath, buffer);

        const s = await stat(filepath);
        return NextResponse.json({ filename, size: s.size, createdAt: now.toISOString() });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

// POST — crear backup
export async function POST() {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    try {
        await mkdir(BACKUP_DIR, { recursive: true });
        const dbUrl = process.env.DATABASE_URL ?? "";
        const { user, password, host, port, db } = parseDbUrl(dbUrl);

        const now = new Date();
        const ts = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const filename = `backup_${ts}.sql`;
        const filepath = path.join(BACKUP_DIR, filename);

        await execAsync(
            `pg_dump -Fp --no-owner --no-acl -h ${host} -p ${port} -U ${user} -d ${db} -f "${filepath}"`,
            { env: { ...process.env, PGPASSWORD: password } }
        );

        const s = await stat(filepath);
        return NextResponse.json({ filename, size: s.size, createdAt: now.toISOString() });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
