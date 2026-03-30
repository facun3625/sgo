import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { expediente, password } = body;

        if (!expediente || !password) {
            return NextResponse.json(
                { error: "Expediente y contraseña son obligatorios" },
                { status: 400 }
            );
        }

        // Buscar usuario por expediente
        const user = await prisma.user.findFirst({
            where: { expediente },
        });

        if (!user) {
            return NextResponse.json(
                { error: "Expediente o contraseña incorrectos" },
                { status: 401 }
            );
        }

        // Si es usuario migrado (registered=0), debe blanquear contraseña primero
        if (user.registered === 0) {
            return NextResponse.json(
                {
                    error: "reset_required",
                    message: "Necesitás establecer tu contraseña para acceder por primera vez.",
                    userName: `${user.apellido}, ${user.nombre}`,
                },
                { status: 403 }
            );
        }

        // Verificar contraseña (solo para registered=1)
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return NextResponse.json(
                { error: "Expediente o contraseña incorrectos" },
                { status: 401 }
            );
        }

        // Verificar estado del usuario — suspendido puede entrar, bloqueado no
        if (user.status !== "active" && user.status !== "suspended") {
            return NextResponse.json(
                { error: "Tu cuenta no está activa. Contactá al administrador." },
                { status: 403 }
            );
        }

        // Parse permisos from user record
        let permisos: string[] = [];
        try {
            permisos = JSON.parse(user.permisos || "[]");
        } catch { permisos = []; }

        // Crear sesión
        await createSession({
            id: user.id,
            expediente: user.expediente || "",
            nombre: user.nombre,
            apellido: user.apellido,
            accessLevel: user.accessLevel,
            permisos,
        });

        return NextResponse.json({
            success: true,
            message: "Login exitoso",
            user: {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                expediente: user.expediente,
                accessLevel: user.accessLevel,
            },
        });
    } catch (error) {
        console.error("Error en login:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
