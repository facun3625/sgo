export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const tipo = new URL(req.url).searchParams.get("tipo");
    if (!tipo) return NextResponse.json({ found: false });

    const solicitud = await prisma.solicitud.findFirst({
        where: {
            expediente: session.expediente || "",
            tipo: { contains: tipo, mode: "insensitive" },
            estado: { in: ["pendiente", "completada"] },
            NOT: { tipo: { contains: "Baja" } },
        },
        orderBy: { fecha: "desc" },
    });

    if (!solicitud) return NextResponse.json({ found: false });

    return NextResponse.json({ found: true, solicitud });
}
