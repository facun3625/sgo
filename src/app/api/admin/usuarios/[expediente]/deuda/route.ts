import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET(_: NextRequest, { params }: { params: Promise<{ expediente: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { expediente } = await params;

    const [deuda, comprobantes] = await Promise.all([
        prisma.deuda.findFirst({ where: { expediente } }),
        prisma.deudaComprobante.findMany({
            where: { expediente },
            orderBy: { fechaVencimiento: "asc" },
            select: { fechaVencimiento: true, monto: true },
        }),
    ]);

    return NextResponse.json({ total: deuda?.monto ?? 0, comprobantes });
}
