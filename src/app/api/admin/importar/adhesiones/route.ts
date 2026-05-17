import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

function extractFields(raw: Record<string, string>): { expediente: string; tipoAdhesion: string } {
    const row = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k.toLowerCase().trim().replace(/\s*\(\d+\)$/, ""), v])
    );

    const expediente = (
        row["expediente"] || row["usuario_sistema"] || row["usuario"] ||
        row["exp"] || row["nro"] || row["numero"] || ""
    ).trim();

    const tipoRaw = (
        row["tipoadhesion"] || row["tipo_adhesion"] || row["tipo"] || row["adhesion"] || ""
    ).trim().toUpperCase();

    let tipoAdhesion = "Adherido sistema anterior";
    if (tipoRaw.includes("TAR")) tipoAdhesion = "Tarjeta";
    else if (tipoRaw.includes("CBU") || tipoRaw.includes("CUE")) tipoAdhesion = "CBU";

    return { expediente, tipoAdhesion };
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
        const { expediente, tipoAdhesion } = extractFields(raw);

        if (!expediente) { errores.push("Fila sin expediente"); continue; }

        // Si ya tiene una adhesión aprobada, omitir
        const existing = await prisma.adhesionDebito.findFirst({
            where: { expediente, estado: "aprobada" },
        });
        if (existing) { omitidos++; continue; }

        try {
            await prisma.adhesionDebito.create({
                data: {
                    expediente,
                    tipoAdhesion,
                    estado: "aprobada",
                    terminosAceptados: true,
                },
            });
            creados++;
        } catch {
            errores.push(`Expediente ${expediente}: error al crear`);
        }
    }

    return NextResponse.json({ creados, omitidos, errores });
}
