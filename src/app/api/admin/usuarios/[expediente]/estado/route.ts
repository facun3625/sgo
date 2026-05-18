import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAdmin } from "@/lib/admin-log";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ expediente: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { expediente } = await params;
    const { status, comentario, motivoId, fechaInicio, fechaFin } = await req.json();

    if (!["active", "suspended", "cancelled"].includes(status)) return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    if (!comentario?.trim()) return NextResponse.json({ error: "El comentario es requerido" }, { status: 400 });
    if (status === "suspended" && !motivoId) return NextResponse.json({ error: "El motivo es obligatorio para suspender" }, { status: 400 });

    const user = await prisma.user.findFirst({
        where: { OR: [{ expediente }, { cod: expediente }] },
    });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const accion = status === "suspended" ? "suspension" : status === "cancelled" ? "cancelacion" : "habilitacion";
    const adminNombre = `${session.apellido}, ${session.nombre}`;

    let motivoNombre: string | null = null;
    let motivoCobra: boolean | null = null;

    if (motivoId) {
        const motivo = await prisma.motivoSuspension.findUnique({ where: { id: Number(motivoId) } });
        if (motivo) {
            motivoNombre = motivo.nombre;
            motivoCobra = motivo.aplicaMulta;
        }
    }

    const parsedFechaFin = fechaFin ? new Date(fechaFin) : null;

    await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: {
                status,
                suspendedUntil: (status === "suspended" || status === "cancelled") ? parsedFechaFin : null,
            },
        }),
        prisma.historialMatricula.create({
            data: {
                expediente: user.expediente ?? expediente,
                accion,
                comentario: comentario.trim(),
                motivoNombre,
                motivoId: motivoId ? Number(motivoId) : null,
                motivoCobra,
                fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
                fechaFin: parsedFechaFin,
                adminNombre,
            },
        }),
    ]);

    await logAdmin({ adminId: session.id, adminNombre, expediente: user.expediente ?? expediente, modulo: "usuarios", accion: accion === "suspension" ? "Suspensión de matrícula" : accion === "cancelacion" ? "Cancelación de matrícula" : "Habilitación de matrícula", detalle: { motivo: motivoNombre, comentario: comentario.trim(), estado: status }, req });
    return NextResponse.json({ ok: true, status, motivoNombre, motivoCobra });
}
