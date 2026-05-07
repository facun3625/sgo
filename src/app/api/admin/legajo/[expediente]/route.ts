import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ expediente: string }> }
) {
    const session = await getSession();
    if (!session || !["admin", "superadmin"].includes(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { expediente } = await params;

    const [dato, user, cambioDatos, historialMatricula, tribunalEtica] = await Promise.all([
        prisma.dato.findFirst({ where: { expediente } }),
        prisma.user.findUnique({
            where: { expediente },
            select: { status: true, suspendedUntil: true, createdAt: true, registered: true },
        }),
        prisma.cambioDatos.findMany({
            where: { expediente },
            orderBy: { createdAt: "desc" },
        }),
        prisma.historialMatricula.findMany({
            where: { expediente },
            orderBy: { createdAt: "desc" },
        }),
        prisma.tribunalEtica.findMany({
            where: { expediente },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    return NextResponse.json({ dato, user, cambioDatos, historialMatricula, tribunalEtica });
}
