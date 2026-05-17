import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { registros } = await req.json() as { registros: { expediente: string; password?: string }[] };
    if (!Array.isArray(registros) || registros.length === 0)
        return NextResponse.json({ error: "Sin registros" }, { status: 400 });

    let creados = 0;
    let omitidos = 0;
    const errores: string[] = [];

    for (const row of registros) {
        const expediente = String(row.expediente ?? "").trim();
        if (!expediente) { errores.push("Fila sin expediente"); continue; }

        // Verificar si ya tiene cuenta
        const existing = await prisma.user.findUnique({ where: { expediente } });
        if (existing) { omitidos++; continue; }

        // Buscar datos del matriculado
        const dato = await prisma.dato.findFirst({ where: { expediente } });
        if (!dato) {
            errores.push(`Expediente ${expediente}: no encontrado en datos`);
            continue;
        }

        // Contraseña: la del CSV o el documento (DNI) como fallback
        const plainPassword = String(row.password ?? "").trim() || dato.documento || expediente;
        const hashed = await bcrypt.hash(plainPassword, 10);

        try {
            await prisma.user.create({
                data: {
                    expediente,
                    cod: dato.cod,
                    apellido: dato.apellido,
                    nombre: dato.nombre,
                    password: hashed,
                    status: "active",
                    accessLevel: "user",
                    registered: 1,
                },
            });
            creados++;
        } catch (e: any) {
            errores.push(`Expediente ${expediente}: ${e?.message?.includes("Unique") ? "ya existe (cod duplicado)" : "error al crear"}`);
        }
    }

    return NextResponse.json({ creados, omitidos, errores });
}
