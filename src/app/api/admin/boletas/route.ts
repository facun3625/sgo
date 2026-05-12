import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
