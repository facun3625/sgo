import { NextRequest, NextResponse } from "next/server";
import { getSession, SessionPayload } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

function isSuperAdmin(session: SessionPayload | null) {
    return session?.accessLevel === "superadmin";
}

// GET: listar dependencias con su cuenta de acceso
export async function GET() {
    const session = await getSession();
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const dependencias = await prisma.dependencia.findMany({
        include: { usuarios: { select: { id: true, expediente: true, status: true } } },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(dependencias.map(d => ({
        id: d.id,
        nombre: d.nombre,
        activo: d.activo,
        zona: d.zona,
        createdAt: d.createdAt,
        usuario: d.usuarios[0] ? { id: d.usuarios[0].id, login: d.usuarios[0].expediente, status: d.usuarios[0].status } : null,
    })));
}

// POST: crear dependencia + cuenta de acceso en un solo paso
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { nombre, login, password, zona } = await req.json();
    if (!nombre?.trim() || !login?.trim() || !password?.trim()) {
        return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const existe = await prisma.user.findFirst({ where: { OR: [{ expediente: login }, { cod: login }] } });
    if (existe) return NextResponse.json({ error: "Ya existe un usuario con ese nombre de acceso" }, { status: 400 });

    const hashed = await bcrypt.hash(password, 10);

    const dependencia = await prisma.dependencia.create({
        data: {
            nombre: nombre.trim(),
            zona: zona?.trim() || null,
            usuarios: {
                create: {
                    nombre: nombre.trim(),
                    apellido: "Dependencia",
                    expediente: login.trim(),
                    password: hashed,
                    accessLevel: "admin",
                    registered: 1,
                    status: "active",
                    permisos: "[]",
                },
            },
        },
        include: { usuarios: { select: { id: true, expediente: true, status: true } } },
    });

    return NextResponse.json({
        id: dependencia.id,
        nombre: dependencia.nombre,
        activo: dependencia.activo,
        zona: dependencia.zona,
        createdAt: dependencia.createdAt,
        usuario: { id: dependencia.usuarios[0].id, login: dependencia.usuarios[0].expediente, status: dependencia.usuarios[0].status },
    });
}
