import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { exec } from "child_process";
import { promisify } from "util";
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

function safeName(filename: string) {
    return /^backup_[\d\-T]+\.sql$/.test(filename);
}

// POST — restaurar un backup
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isSuperAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { filename, confirmacion } = await req.json();

    if (confirmacion !== "RESTAURAR")
        return NextResponse.json({ error: "Confirmación incorrecta" }, { status: 400 });

    if (!safeName(filename))
        return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });

    try {
        const dbUrl = process.env.DATABASE_URL ?? "";
        const { user, password, host, port, db } = parseDbUrl(dbUrl);
        const filepath = path.join(BACKUP_DIR, filename);

        // Terminar conexiones activas y limpiar la BD
        await execAsync(
            `psql -h ${host} -p ${port} -U ${user} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${db}' AND pid <> pg_backend_pid();"`,
            { env: { ...process.env, PGPASSWORD: password } }
        );

        // Drop y recrear la BD
        await execAsync(
            `psql -h ${host} -p ${port} -U ${user} -d postgres -c "DROP DATABASE IF EXISTS \\"${db}\\"; CREATE DATABASE \\"${db}\\";"`,
            { env: { ...process.env, PGPASSWORD: password } }
        );

        // Restaurar el backup
        await execAsync(
            `psql -h ${host} -p ${port} -U ${user} -d ${db} -f "${filepath}"`,
            { env: { ...process.env, PGPASSWORD: password } }
        );

        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
