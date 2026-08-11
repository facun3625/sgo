export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { enviarEmailMarketing } from "@/lib/mailer";
import { logAdmin } from "@/lib/admin-log";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const campanas = await prisma.emailMarketing.findMany({
        orderBy: { createdAt: "desc" },
        include: { destinatarios: { select: { estado: true } } },
    });

    const result = campanas.map(c => ({
        id: c.id,
        asunto: c.asunto,
        totalEnvios: c.totalEnvios,
        enviados: c.destinatarios.filter(d => d.estado === "enviado").length,
        errores: c.destinatarios.filter(d => d.estado === "error").length,
        pendientes: c.destinatarios.filter(d => d.estado === "pendiente").length,
        cancelada: c.cancelada,
        adminNombre: c.adminNombre,
        createdAt: c.createdAt,
    }));

    return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { asunto, contenido, expedientes, enviarATodos } = await req.json();
    if (!asunto?.trim() || !contenido?.trim()) {
        return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }
    if (!enviarATodos && (!Array.isArray(expedientes) || expedientes.length === 0)) {
        return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const datos = enviarATodos
        ? await prisma.dato.findMany({ where: { emailLegal: { not: null } }, select: { expediente: true, emailLegal: true } })
        : await prisma.dato.findMany({ where: { expediente: { in: expedientes }, emailLegal: { not: null } }, select: { expediente: true, emailLegal: true } });

    const destinatarios = datos.filter(d => d.expediente && d.emailLegal) as { expediente: string; emailLegal: string }[];

    if (destinatarios.length === 0) {
        return NextResponse.json({ error: "Ningún destinatario válido con email registrado" }, { status: 400 });
    }

    const adminNombre = `${session.apellido}, ${session.nombre}`;

    const campana = await prisma.emailMarketing.create({
        data: {
            asunto: asunto.trim(),
            contenido: contenido.trim(),
            enviarATodos: !!enviarATodos,
            adminNombre,
            totalEnvios: destinatarios.length,
            destinatarios: {
                create: destinatarios.map(d => ({ expediente: d.expediente, email: d.emailLegal })),
            },
        },
    });

    // Envío en segundo plano, en tandas — no bloquea la respuesta
    enviarEmailMarketing(campana.id).catch(err => console.error("[mailer] Error en campaña de email marketing:", err));

    await logAdmin({
        adminId: session.id,
        adminNombre,
        modulo: "email-marketing",
        accion: `Campaña de Email Marketing: "${asunto.trim()}"`,
        detalle: { totalEnvios: destinatarios.length, enviarATodos: !!enviarATodos },
        req,
    });

    return NextResponse.json({ id: campana.id, totalEnvios: destinatarios.length });
}
