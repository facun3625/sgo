import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { enviarComunicadoMasivo } from "@/lib/mailer";
import { logAdmin } from "@/lib/admin-log";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

// Reenvía solo el email del comunicado (sin duplicar la notificación interna ni tocar el estado de lectura)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const envio = await prisma.envioMasivo.findUnique({
        where: { id: Number(id) },
        include: { destinatarios: { select: { expediente: true } } },
    });
    if (!envio) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const expedientes = envio.destinatarios.map(d => d.expediente);
    const datos = await prisma.dato.findMany({
        where: { expediente: { in: expedientes }, emailLegal: { not: null } },
        select: { emailLegal: true },
    });
    const emails = datos.map(d => d.emailLegal!).filter(Boolean);

    if (emails.length === 0) {
        return NextResponse.json({ error: "Ningún destinatario tiene email registrado" }, { status: 400 });
    }

    enviarComunicadoMasivo(emails, envio.asunto, undefined, undefined, undefined)
        .catch(err => console.error("[mailer] Error reenviando comunicado:", err));

    await logAdmin({
        adminId: session.id,
        adminNombre: `${session.apellido}, ${session.nombre}`,
        modulo: "envios",
        accion: `Reenvío de email: "${envio.asunto}"`,
        detalle: { envioId: envio.id, emailsEnviados: emails.length },
        req,
    });

    return NextResponse.json({ emailsEnviados: emails.length });
}
