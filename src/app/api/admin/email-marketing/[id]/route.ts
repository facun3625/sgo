export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const campana = await prisma.emailMarketing.findUnique({
        where: { id: Number(id) },
        include: { destinatarios: { orderBy: { id: "asc" } } },
    });
    if (!campana) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const expedientes = campana.destinatarios.map(d => d.expediente);
    const datos = await prisma.dato.findMany({
        where: { expediente: { in: expedientes } },
        select: { expediente: true, apellido: true, nombre: true },
    });
    const nombreMap = Object.fromEntries(datos.map(d => [d.expediente, `${d.apellido}, ${d.nombre}`]));

    return NextResponse.json({
        id: campana.id,
        asunto: campana.asunto,
        contenido: campana.contenido,
        enviarATodos: campana.enviarATodos,
        adminNombre: campana.adminNombre,
        totalEnvios: campana.totalEnvios,
        createdAt: campana.createdAt,
        destinatarios: campana.destinatarios.map(d => ({
            id: d.id,
            expediente: d.expediente,
            nombre: nombreMap[d.expediente] ?? d.expediente,
            email: d.email,
            estado: d.estado,
            error: d.error,
            enviadoAt: d.enviadoAt,
        })),
    });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const campana = await prisma.emailMarketing.findUnique({ where: { id: Number(id) }, select: { id: true } });
    if (!campana) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    await prisma.emailMarketingDestinatario.deleteMany({ where: { campanaId: Number(id) } });
    await prisma.emailMarketing.delete({ where: { id: Number(id) } });

    return NextResponse.json({ success: true });
}
