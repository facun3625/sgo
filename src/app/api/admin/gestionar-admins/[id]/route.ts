import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

function isSuperAdmin(session: any) {
    return session?.accessLevel === "superadmin";
}

// PATCH: update admin permissions and/or password
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const { permisos, password } = await req.json();

    const updateData: any = {};
    if (permisos !== undefined) updateData.permisos = JSON.stringify(permisos);
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, nombre: true, apellido: true, expediente: true, accessLevel: true, permisos: true, status: true },
    });

    return NextResponse.json({
        ...user,
        permisos: (() => { try { return JSON.parse(user.permisos || "[]"); } catch { return []; } })()
    });
}

// DELETE: remove admin user
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id: idStr } = await params;
    const id = parseInt(idStr);

    // Don't allow deleting superadmin
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.accessLevel === "superadmin") {
        return NextResponse.json({ error: "No se puede eliminar este usuario" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
