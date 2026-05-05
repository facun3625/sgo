import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { crearNotificacion } from "@/lib/notificaciones";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const { accion, respuesta } = await req.json(); // accion: "aprobar" | "rechazar"

    if (!["aprobar", "rechazar"].includes(accion)) return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    if (!respuesta?.trim()) return NextResponse.json({ error: "La respuesta es requerida" }, { status: 400 });

    const solicitud = await prisma.solicitudRehabilitacion.findUnique({ where: { id: parseInt(id) } });
    if (!solicitud) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    if (solicitud.estado !== "pendiente") return NextResponse.json({ error: "Esta solicitud ya fue procesada" }, { status: 400 });

    const adminNombre = `${session.apellido}, ${session.nombre}`;

    if (accion === "aprobar") {
        const user = await prisma.user.findFirst({
            where: { expediente: solicitud.expediente },
        });
        if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

        await prisma.$transaction([
            prisma.solicitudRehabilitacion.update({
                where: { id: solicitud.id },
                data: { estado: "aprobada", respuesta: respuesta.trim(), adminNombre },
            }),
            prisma.user.update({
                where: { id: user.id },
                data: { status: "active" },
            }),
            prisma.historialMatricula.create({
                data: {
                    expediente: solicitud.expediente,
                    accion: "habilitacion",
                    comentario: `Rehabilitación aprobada. ${respuesta.trim()}`,
                    adminNombre,
                },
            }),
        ]);

        await crearNotificacion(
            solicitud.expediente,
            "Matrícula rehabilitada",
            `Tu solicitud de rehabilitación fue aprobada. ${respuesta.trim()}`,
            "general"
        );
    } else {
        await prisma.solicitudRehabilitacion.update({
            where: { id: solicitud.id },
            data: { estado: "rechazada", respuesta: respuesta.trim(), adminNombre },
        });

        await crearNotificacion(
            solicitud.expediente,
            "Solicitud de rehabilitación rechazada",
            `Tu solicitud fue rechazada. ${respuesta.trim()}`,
            "general"
        );
    }

    return NextResponse.json({ ok: true });
}
