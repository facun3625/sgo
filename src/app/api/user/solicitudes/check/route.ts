export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const tipo = new URL(req.url).searchParams.get("tipo");
    if (!tipo) return NextResponse.json({ found: false });

    // Solo bloquea mientras hay un pedido pendiente de gestionar — una vez
    // resuelto (completada o rechazada) tiene que poder volver a pedir (ej.
    // para cambiar la clave ya entregada). Antes también bloqueaba en
    // "completada", dejando al usuario sin forma de volver a pedir nunca más.
    const solicitud = await prisma.solicitud.findFirst({
        where: {
            expediente: session.expediente || "",
            tipo: { contains: tipo, mode: "insensitive" },
            estado: "pendiente",
            NOT: { tipo: { contains: "Baja" } },
        },
        orderBy: { fecha: "desc" },
    });

    if (!solicitud) return NextResponse.json({ found: false });

    return NextResponse.json({ found: true, solicitud });
}
