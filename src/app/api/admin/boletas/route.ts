import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { rm, mkdir, access } from "node:fs/promises";

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

    // Borrar carpeta y recrearla vacía
    try { await access(uploadDir); await rm(uploadDir, { recursive: true, force: true }); } catch { /* no existe */ }
    await mkdir(uploadDir, { recursive: true });

    // Borrar registros DB
    const { count } = await prisma.facturaSantaFe.deleteMany({ where: { tipo } });

    return NextResponse.json({ ok: true, eliminados: count });
}
