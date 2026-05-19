import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

function isSuperAdmin(session: any) {
    return session?.accessLevel === "superadmin";
}

// GET: list all admin users
export async function GET() {
    const session = await getSession();
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const admins = await prisma.user.findMany({
        where: { accessLevel: { in: ["admin", "superadmin"] } },
        select: { id: true, nombre: true, apellido: true, expediente: true, accessLevel: true, permisos: true, createdAt: true, status: true },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(admins.map(a => ({
        ...a,
        permisos: (() => { try { return JSON.parse(a.permisos || "[]"); } catch { return []; } })()
    })));
}

// POST: create admin user
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { nombre, apellido, expediente, password, permisos, esSuperadmin } = await req.json();

    if (!nombre || !apellido || !expediente || !password) {
        return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const exists = await prisma.user.findFirst({
        where: { OR: [{ expediente }, { cod: expediente }] },
    });
    if (exists) return NextResponse.json({ error: "Ya existe un usuario con ese usuario/código" }, { status: 400 });

    const hashed = await bcrypt.hash(password, 10);
    const accessLevel = esSuperadmin ? "superadmin" : "admin";

    const user = await prisma.user.create({
        data: {
            nombre,
            apellido,
            ...(esSuperadmin ? { cod: expediente } : { expediente }),
            password: hashed,
            accessLevel,
            registered: 1,
            status: "active",
            permisos: esSuperadmin ? "[]" : JSON.stringify(permisos || []),
        },
        select: { id: true, nombre: true, apellido: true, expediente: true, accessLevel: true, permisos: true, createdAt: true, status: true },
    });

    return NextResponse.json({
        ...user,
        permisos: (() => { try { return JSON.parse(user.permisos || "[]"); } catch { return []; } })()
    });
}
