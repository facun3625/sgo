import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { enviarNotificacionMensaje } from "@/lib/mailer";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;
    const { contenido } = await req.json();
    if (!contenido?.trim()) return NextResponse.json({ error: "Contenido requerido" }, { status: 400 });

    const [msg, conv] = await prisma.$transaction([
        prisma.mensajeChat.create({
            data: { conversacionId: parseInt(id), de: "admin", contenido: contenido.trim() },
        }),
        prisma.conversacion.update({
            where: { id: parseInt(id) },
            data: { updatedAt: new Date() },
            select: { expediente: true },
        }),
    ]);

    // Fire-and-forget: notificar al usuario por email
    prisma.dato.findFirst({
        where: { expediente: conv.expediente },
        select: { emailLegal: true },
    }).then(dato => {
        if (dato?.emailLegal) enviarNotificacionMensaje(dato.emailLegal).catch(() => {});
    }).catch(() => {});

    return NextResponse.json(msg);
}
