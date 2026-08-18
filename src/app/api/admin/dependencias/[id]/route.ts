import { NextRequest, NextResponse } from "next/server";
import { getSession, SessionPayload } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { obtenerCobrosDependencia, rangoMes } from "@/lib/dependencias";

function isSuperAdmin(session: SessionPayload | null) {
    return session?.accessLevel === "superadmin";
}

// GET: historial de cobros en efectivo registrados por esta dependencia — sin
// ?mes trae todo, con ?mes=YYYY-MM filtra a ese mes puntual.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const mes = new URL(req.url).searchParams.get("mes");

    const [dependencia, { cobros, totalCobrado }] = await Promise.all([
        prisma.dependencia.findUnique({ where: { id }, select: { id: true, nombre: true, activo: true } }),
        obtenerCobrosDependencia(id, rangoMes(mes)),
    ]);
    if (!dependencia) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    return NextResponse.json({ dependencia, cobros, totalCobrado });
}

// PATCH: editar nombre, activar/desactivar, blanquear contraseña
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const { nombre, activo, password, zona } = await req.json();

    const dependencia = await prisma.dependencia.findUnique({ where: { id }, include: { usuarios: true } });
    if (!dependencia) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const dependenciaData: { nombre?: string; activo?: boolean; zona?: string | null } = {};
    if (nombre !== undefined) dependenciaData.nombre = String(nombre).trim();
    if (activo !== undefined) dependenciaData.activo = !!activo;
    if (zona !== undefined) dependenciaData.zona = String(zona).trim() || null;

    const usuarioData: { nombre?: string; password?: string } = {};
    if (nombre !== undefined) usuarioData.nombre = String(nombre).trim();
    if (password) usuarioData.password = await bcrypt.hash(password, 10);

    const usuario = dependencia.usuarios[0];

    await prisma.$transaction([
        prisma.dependencia.update({ where: { id }, data: dependenciaData }),
        ...(usuario ? [prisma.user.update({ where: { id: usuario.id }, data: usuarioData })] : []),
    ]);

    return NextResponse.json({ ok: true });
}
