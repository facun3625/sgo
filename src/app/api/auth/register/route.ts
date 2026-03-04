import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { cod, apellido, nombre, expediente, email, password } = body;

        // Validar campos requeridos
        if (!expediente || !email || !password) {
            return NextResponse.json(
                { error: "Email y contraseña son obligatorios" },
                { status: 400 }
            );
        }

        // Verificar que no exista ya
        const existingUser = await prisma.user.findFirst({
            where: { expediente },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "El usuario ya se encuentra registrado" },
                { status: 409 }
            );
        }

        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(password, 12);

        // Crear usuario
        const user = await prisma.user.create({
            data: {
                apellido: apellido || "",
                nombre: nombre || "",
                expediente,
                cod: cod || null,
                email,
                password: hashedPassword,
                status: "active",
                accessLevel: "user",
            },
        });

        return NextResponse.json({
            success: true,
            message: "Usuario registrado correctamente",
            user: {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                expediente: user.expediente,
            },
        });
    } catch (error) {
        console.error("Error en registro:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
