import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { matricula, documento, folio, tomo } = body;

        // Validar campos requeridos
        if (!matricula || !documento || !folio || !tomo) {
            return NextResponse.json(
                { error: "Todos los campos son obligatorios" },
                { status: 400 }
            );
        }

        // 1. Verificar si ya existe en la tabla users
        const existingUser = await prisma.user.findFirst({
            where: { expediente: matricula },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "El usuario ya se encuentra registrado" },
                { status: 409 }
            );
        }

        // 2. Buscar en la tabla datos (las 4 condiciones deben coincidir)
        const dato = await prisma.dato.findFirst({
            where: {
                expediente: matricula,
                documento: documento,
                folio: folio,
                tomo: tomo,
            },
        });

        if (!dato) {
            return NextResponse.json(
                { error: "No se encontró un matriculado con esos datos. Verificá la información ingresada." },
                { status: 404 }
            );
        }

        // 3. Encontrado — devolver datos para completar registro
        return NextResponse.json({
            success: true,
            message: "Usuario encontrado",
            data: {
                cod: dato.cod,
                apellido: dato.apellido,
                nombre: dato.nombre,
                expediente: dato.expediente,
            },
        });
    } catch (error) {
        console.error("Error en verificación:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
