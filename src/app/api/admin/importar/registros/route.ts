import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getSession();
    if (!session || (session.accessLevel !== "superadmin" && session.accessLevel !== "admin")) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const [deudas, pagosAnuales, adhesiones] = await Promise.all([
        prisma.deuda.findMany({ orderBy: { expediente: "asc" } }),
        prisma.pagoAnual.findMany({ orderBy: { expediente: "asc" } }),
        prisma.adhesionDebito.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

    return NextResponse.json({ deudas, pagosAnuales, adhesiones });
}
