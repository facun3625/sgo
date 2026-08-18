import { NextRequest, NextResponse } from "next/server";
import { getSession, SessionPayload } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { obtenerCobrosDelegacion, rangoMes } from "@/lib/delegaciones";

function isSuperAdmin(session: SessionPayload | null) {
    return session?.accessLevel === "superadmin";
}

// GET: historial de cobros en efectivo registrados por esta delegación — sin
// ?mes trae todo, con ?mes=YYYY-MM filtra a ese mes puntual.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const mes = new URL(req.url).searchParams.get("mes");

    const [delegacion, { cobros, totalCobrado }] = await Promise.all([
        prisma.delegacion.findUnique({ where: { id }, select: { id: true, nombre: true, activo: true } }),
        obtenerCobrosDelegacion(id, rangoMes(mes)),
    ]);
    if (!delegacion) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    return NextResponse.json({ delegacion, cobros, totalCobrado });
}

// PATCH: editar nombre, activar/desactivar, blanquear contraseña
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const { nombre, activo, password, zona } = await req.json();

    const delegacion = await prisma.delegacion.findUnique({ where: { id }, include: { usuarios: true } });
    if (!delegacion) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const delegacionData: { nombre?: string; activo?: boolean; zona?: string | null } = {};
    if (nombre !== undefined) delegacionData.nombre = String(nombre).trim();
    if (activo !== undefined) delegacionData.activo = !!activo;
    if (zona !== undefined) delegacionData.zona = String(zona).trim() || null;

    const usuarioData: { nombre?: string; password?: string } = {};
    if (nombre !== undefined) usuarioData.nombre = String(nombre).trim();
    if (password) usuarioData.password = await bcrypt.hash(password, 10);

    const usuario = delegacion.usuarios[0];

    await prisma.$transaction([
        prisma.delegacion.update({ where: { id }, data: delegacionData }),
        ...(usuario ? [prisma.user.update({ where: { id: usuario.id }, data: usuarioData })] : []),
    ]);

    return NextResponse.json({ ok: true });
}

// DELETE: borrado definitivo — solo si nunca registró cobros (si tiene
// historial, hay que desactivarla en vez de borrarla para no perder el rastro
// de esos pagos).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id: idStr } = await params;
    const id = parseInt(idStr);

    const delegacion = await prisma.delegacion.findUnique({ where: { id }, include: { usuarios: true } });
    if (!delegacion) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const [cuotas, deudas, pagosAnuales] = await Promise.all([
        prisma.cuotaMensual.count({ where: { delegacionId: id } }),
        prisma.deudaPagada.count({ where: { delegacionId: id } }),
        prisma.pagoAnual.count({ where: { delegacionId: id } }),
    ]);
    if (cuotas + deudas + pagosAnuales > 0) {
        return NextResponse.json({ error: "Esta delegación ya registró cobros — desactivala en vez de borrarla, para no perder ese historial." }, { status: 409 });
    }

    await prisma.$transaction([
        ...delegacion.usuarios.map(u => prisma.user.delete({ where: { id: u.id } })),
        prisma.delegacion.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true });
}
