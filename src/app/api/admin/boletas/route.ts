import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { rm, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "superadmin"].includes(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const tipo = req.nextUrl.searchParams.get("tipo");

    // Si se pasa ?tipo=xxx devuelve los registros de ese tipo
    if (tipo && ["mensual", "anual", "deuda"].includes(tipo)) {
        const registros = await prisma.facturaSantaFe.findMany({
            where: { tipo },
            select: { id: true, cod: true, factura: true, expediente: true },
            orderBy: { cod: "asc" },
        });
        return NextResponse.json(registros);
    }

    const tipos = ["mensual", "anual", "deuda"] as const;
    const batches = await Promise.all(
        tipos.map(async (t) => {
            const latest = await prisma.facturaSantaFe.findFirst({
                where: { tipo: t },
                orderBy: { createdAt: "desc" },
                select: { periodo: true, createdAt: true },
            });
            const total = await prisma.facturaSantaFe.count({ where: { tipo: t } });
            return { tipo: t, periodo: latest?.periodo ?? null, total, uploadedAt: latest?.createdAt ?? null };
        })
    );

    return NextResponse.json(batches);
}

export async function DELETE(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "superadmin"].includes(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const tipo = req.nextUrl.searchParams.get("tipo");
    if (!tipo || !["mensual", "anual", "deuda"].includes(tipo))
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });

    const uploadDir = `${process.cwd()}/public/uploads/boletas/${tipo}`;

    // Vaciar el contenido sin borrar la carpeta en sí: recrearla (mkdir) la deja
    // con dueño root (la app corre como root en el VPS), rompiendo los permisos
    // del usuario FTP que sube los PDF directamente a esta carpeta.
    try {
        const entries = await readdir(uploadDir);
        await Promise.all(entries.map(e => rm(path.join(uploadDir, e), { recursive: true, force: true })));
    } catch {
        await mkdir(uploadDir, { recursive: true });
    }

    // Borrar registros DB
    const { count } = await prisma.facturaSantaFe.deleteMany({ where: { tipo } });

    return NextResponse.json({ ok: true, eliminados: count });
}
