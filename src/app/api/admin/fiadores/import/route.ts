import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface FiadorRow {
    expediente: string;
    fiador: string;
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "superadmin"].includes(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const rows: FiadorRow[] = body.registros ?? [];

    let creados = 0;
    let reemplazados = 0;
    let omitidos = 0;
    const errores: string[] = [];

    for (const row of rows) {
        const expediente = String(row.expediente ?? "").trim();
        const fiadorExpediente = String(row.fiador ?? "").trim();

        if (!expediente || !fiadorExpediente) {
            errores.push(`Fila inválida: expediente="${expediente}" fiador="${fiadorExpediente}"`);
            continue;
        }

        if (expediente === fiadorExpediente) {
            errores.push(`Expediente ${expediente}: un matriculado no puede ser su propio fiador`);
            continue;
        }

        try {
            const existing = await prisma.fiador.findUnique({ where: { expediente } });

            if (existing) {
                if (existing.fiadorExpediente === fiadorExpediente) {
                    omitidos++;
                    continue;
                }
                await prisma.fiador.update({
                    where: { expediente },
                    data: { fiadorExpediente },
                });
                reemplazados++;
            } else {
                await prisma.fiador.create({ data: { expediente, fiadorExpediente } });
                creados++;
            }
        } catch (e) {
            errores.push(`Expediente ${expediente}: ${(e as Error).message}`);
        }
    }

    return NextResponse.json({ creados, reemplazados, omitidos, errores });
}
