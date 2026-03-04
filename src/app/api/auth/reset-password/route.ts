import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { expediente, documento, folio, tomo, newPassword } = body;

        if (!expediente || !documento || !folio || !tomo || !newPassword) {
            return NextResponse.json(
                { error: "Todos los campos son obligatorios" },
                { status: 400 }
            );
        }

        // Verificar que el usuario exista y sea migrado (registered=0)
        const user = await prisma.user.findFirst({
            where: { expediente },
        });

        if (!user || user.registered !== 0) {
            return NextResponse.json(
                { error: "No se puede blanquear la contraseña para este usuario" },
                { status: 400 }
            );
        }

        // Verificar los 4 datos contra la tabla datos
        const dato = await prisma.dato.findFirst({
            where: {
                expediente,
                documento,
                folio,
                tomo,
            },
        });

        if (!dato) {
            return NextResponse.json(
                { error: "Los datos ingresados no coinciden. Verificá la información." },
                { status: 404 }
            );
        }

        // Hashear nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Actualizar contraseña y marcar como registered=1
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                registered: 1,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Contraseña establecida correctamente. Ya podés acceder.",
        });
    } catch (error) {
        console.error("Error en reset:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
