export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getSession();
    if (!session || !session.expediente) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const solicitud = await prisma.solicitudRehabilitacion.findFirst({
        where: { expediente: session.expediente },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ solicitud });
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !session.expediente) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Solo usuarios suspendidos pueden solicitar
    const user = await prisma.user.findUnique({ where: { expediente: session.expediente } });
    if (!user || user.status !== "suspended") {
        return NextResponse.json({ error: "Solo usuarios suspendidos pueden solicitar rehabilitación" }, { status: 403 });
    }

    // No puede tener una solicitud pendiente activa
    const pendiente = await prisma.solicitudRehabilitacion.findFirst({
        where: { expediente: session.expediente, estado: "pendiente" },
    });
    if (pendiente) {
        return NextResponse.json({ error: "Ya tenés una solicitud pendiente" }, { status: 400 });
    }

    const { mensaje } = await req.json();
    if (!mensaje?.trim()) return NextResponse.json({ error: "El mensaje es requerido" }, { status: 400 });

    const solicitud = await prisma.solicitudRehabilitacion.create({
        data: {
            expediente: session.expediente,
            mensaje: mensaje.trim(),
        },
    });

    return NextResponse.json({ solicitud });
}
