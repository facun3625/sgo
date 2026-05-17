import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { rm, mkdir, access } from "node:fs/promises";
import { join } from "node:path";

export async function GET() {
    const session = await getSession();
    if (!session || !["admin", "superadmin"].includes(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const tipos = ["mensual", "anual", "deuda"] as const;
    const batches = await Promise.all(
        tipos.map(async (tipo) => {
            const latest = await prisma.facturaSantaFe.findFirst({
                where: { tipo },
                orderBy: { createdAt: "desc" },
                select: { periodo: true, createdAt: true },
            });
            const total = await prisma.facturaSantaFe.count({ where: { tipo } });
            return { tipo, periodo: latest?.periodo ?? null, total, uploadedAt: latest?.createdAt ?? null };
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

    const uploadDir = join(process.cwd(), "public", "uploads", "boletas", tipo);

    // Borrar carpeta y recrearla vacía
    try { await access(uploadDir); await rm(uploadDir, { recursive: true, force: true }); } catch { /* no existe */ }
    await mkdir(uploadDir, { recursive: true });

    // Borrar registros DB
    const { count } = await prisma.facturaSantaFe.deleteMany({ where: { tipo } });

    return NextResponse.json({ ok: true, eliminados: count });
}
