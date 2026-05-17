import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

// Detecta el expediente y password desde cualquier nombre de columna del Excel viejo
function extractFields(raw: Record<string, string>): { expediente: string; password: string } {
    // Normalizar keys: lowercase, quitar sufijos tipo " (1)", "(2)", etc.
    const row = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k.toLowerCase().trim().replace(/\s*\(\d+\)$/, ""), v])
    );

    const expediente = (
        row["expediente"] || row["usuario_sistema"] || row["usuario"] ||
        row["exp"] || row["nro"] || row["numero"] || row["cod"] || ""
    ).trim();

    // Buscar password por nombre de columna o por valor con formato bcrypt
    let password = (
        row["password"] || row["contraseña"] || row["pass"] ||
        row["hash"] || row["clave"] || row["__empty"] || ""
    ).trim();

    if (!password) {
        for (const val of Object.values(row)) {
            if (val.startsWith("$2")) { password = val; break; }
        }
    }

    return { expediente, password };
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { registros } = await req.json() as { registros: Record<string, string>[] };
    if (!Array.isArray(registros) || registros.length === 0)
        return NextResponse.json({ error: "Sin registros" }, { status: 400 });

    let creados = 0;
    let omitidos = 0;
    const errores: string[] = [];

    for (const raw of registros) {
        const { expediente, password: rawPassword } = extractFields(raw);

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

        // Si ya es un hash bcrypt ($2y$ de PHP o $2b$ de Node), usarlo directo
        // $2y$ → reemplazar por $2b$ para compatibilidad con bcryptjs
        let hashed: string;
        const passValue = rawPassword || dato.documento || expediente;
        if (passValue.startsWith("$2")) {
            hashed = passValue.replace(/^\$2y\$/, "$2b$");
        } else {
            hashed = await bcrypt.hash(passValue, 10);
        }

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
