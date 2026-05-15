import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const { password } = await req.json();

    if (!password || password.length < 4)
        return NextResponse.json({ error: "La contraseña debe tener al menos 4 caracteres" }, { status: 400 });

    const userId = parseInt(id);
    if (isNaN(userId))
        return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.accessLevel === "admin" || user.accessLevel === "superadmin")
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    return NextResponse.json({ ok: true });
}
