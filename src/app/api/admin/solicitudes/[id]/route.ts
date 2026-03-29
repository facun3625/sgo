export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

export async function GET(
    _: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const solicitud = await prisma.solicitud.findUnique({
        where: { id: parseInt(id) },
    });
    if (!solicitud)
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const user = await prisma.user.findFirst({
        where: { expediente: solicitud.expediente },
        select: { nombre: true, apellido: true, expediente: true },
    });

    return NextResponse.json({ ...solicitud, usuario: user });
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    const solicitud = await prisma.solicitud.findUnique({
        where: { id: parseInt(id) },
    });
    if (!solicitud)
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const currentDetalles = (solicitud.detalles as Record<string, any>) ?? {};

    if (action === "ssfe") {
        const { clave } = body;
        const newDetalles = {
            ...currentDetalles,
            respuesta: { ...(currentDetalles.respuesta ?? {}), clave },
        };
        const updated = await prisma.solicitud.update({
            where: { id: parseInt(id) },
            data: { estado: "completada", detalles: newDetalles },
        });
        await prisma.notificacion.create({
            data: {
                expediente: solicitud.expediente,
                titulo: solicitud.tipo,
                mensaje: `Tu trámite ha sido procesado. Tu clave SISFE es: ${clave}`,
                tipo: "tramite",
            },
        });
        return NextResponse.json(updated);
    }

    if (action === "catastro") {
        const { usuario } = body;
        const newDetalles = {
            ...currentDetalles,
            respuesta: { ...(currentDetalles.respuesta ?? {}), usuario },
        };
        const updated = await prisma.solicitud.update({
            where: { id: parseInt(id) },
            data: { estado: "completada", detalles: newDetalles },
        });
        await prisma.notificacion.create({
            data: {
                expediente: solicitud.expediente,
                titulo: solicitud.tipo,
                mensaje: `Tu trámite ha sido procesado. Tu usuario CATASTRO/SIGIT es: ${usuario}`,
                tipo: "tramite",
            },
        });
        return NextResponse.json(updated);
    }

    if (action === "adjunto") {
        const { url } = body;
        const updated = await prisma.solicitud.update({
            where: { id: parseInt(id) },
            data: { estado: "completada", adjunto: url },
        });
        await prisma.notificacion.create({
            data: {
                expediente: solicitud.expediente,
                titulo: solicitud.tipo,
                mensaje: `Tu trámite ha sido procesado. Se adjuntó el documento de respuesta a tu solicitud de jurisprudencia.`,
                tipo: "tramite",
            },
        });
        return NextResponse.json(updated);
    }

    if (action === "suspender") {
        // Aprobar solicitud de suspensión/cancelación → cambiar estado del usuario
        const esCancelacion = solicitud.tipo.toLowerCase().includes("cancelación") || solicitud.tipo.toLowerCase().includes("cancelacion");
        const nuevoStatus = esCancelacion ? "cancelled" : "suspended";

        await prisma.user.updateMany({
            where: { expediente: solicitud.expediente },
            data: { status: nuevoStatus },
        });

        const updated = await prisma.solicitud.update({
            where: { id: parseInt(id) },
            data: { estado: "completada" },
        });

        await prisma.notificacion.create({
            data: {
                expediente: solicitud.expediente,
                titulo: solicitud.tipo,
                mensaje: esCancelacion
                    ? "Tu solicitud de cancelación de matrícula fue aprobada por el Colegio."
                    : "Tu solicitud de suspensión de matrícula fue aprobada por el Colegio.",
                tipo: "tramite",
            },
        });

        return NextResponse.json(updated);
    }

    if (action === "rechazar") {
        const { motivo } = body;
        const newDetalles = {
            ...currentDetalles,
            rechazo: { motivo: motivo ?? null },
        };
        const updated = await prisma.solicitud.update({
            where: { id: parseInt(id) },
            data: { estado: "rechazada", detalles: newDetalles },
        });
        await prisma.notificacion.create({
            data: {
                expediente: solicitud.expediente,
                titulo: solicitud.tipo,
                mensaje: motivo
                    ? `Tu trámite fue rechazado. Motivo: ${motivo}`
                    : `Tu trámite fue rechazado por el administrador.`,
                tipo: "tramite",
            },
        });
        return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
