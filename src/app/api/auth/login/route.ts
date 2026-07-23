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

        const user = (await prisma.user.findFirst({ where: { expediente } }))
            ?? (await prisma.user.findFirst({ where: { cod: expediente } }));

        if (!user) {
            return NextResponse.json(
                { error: "Expediente o contraseña incorrectos" },
                { status: 401 }
            );
        }

        // bcryptjs verifica tanto $2y$ (PHP) como $2b$ (Node) sin distinción
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return NextResponse.json(
                { error: "wrong_password" },
                { status: 401 }
            );
        }

        // Si era usuario migrado, marcarlo como registrado en el nuevo sistema
        if (user.registered === 0) {
            await prisma.user.update({
                where: { id: user.id },
                data: { registered: 1 },
            });
        }

        if (user.status !== "active" && user.status !== "suspended" && user.status !== "cancelled") {
            return NextResponse.json(
                { error: "Tu cuenta no está activa. Contactá al administrador." },
                { status: 403 }
            );
        }

        let permisos: string[] = [];
        try { permisos = JSON.parse(user.permisos || "[]"); } catch { permisos = []; }

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
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
