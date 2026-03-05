import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { expediente: session.expediente }
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        // Verificar contraseña actual
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 401 });
        }

        // Hashear nueva contraseña
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);

        // Actualizar
        await prisma.user.update({
            where: { expediente: session.expediente },
            data: { password: hashedNewPassword }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error password change:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
