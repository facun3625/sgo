import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

function extractFields(raw: Record<string, string>): { expediente: string; tipoAdhesion: string } {
    const row = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k.toLowerCase().trim().replace(/\s*\(\d+\)$/, ""), v])
    );
    // Buscar la columna de expediente por nombre exacto o por cualquier columna que contenga "expediente"
    const expKey = Object.keys(row).find(k => k.includes("expediente") || k.includes("exp") || k.includes("nro") || k.includes("numero") || k.includes("usuario"));
    const expediente = (
        row["expediente"] || row["usuario_sistema"] || row["usuario"] ||
        row["exp"] || row["nro"] || row["numero"] || (expKey ? row[expKey] : "") || ""
    ).trim();
    const tipoRaw = (
        row["tipoadhesion"] || row["tipo_adhesion"] || row["tipo"] || row["adhesion"] || ""
    ).trim().toUpperCase();
    let tipoAdhesion = "Adherido sistema anterior";
    if (tipoRaw.includes("TAR")) tipoAdhesion = "Tarjeta";
    else if (tipoRaw.includes("CBU") || tipoRaw.includes("CUE")) tipoAdhesion = "CBU";
    return { expediente, tipoAdhesion };
}

const BATCH = 200;

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { registros } = await req.json() as { registros: Record<string, string>[] };
    if (!Array.isArray(registros) || registros.length === 0)
        return NextResponse.json({ error: "Sin registros" }, { status: 400 });

    const expedientesArchivo = registros
        .map(r => extractFields(r).expediente)
        .filter(Boolean);

    // Una sola query para saber cuáles ya tienen adhesión aprobada
    const existentes = await prisma.adhesionDebito.findMany({
        where: { expediente: { in: expedientesArchivo }, estado: "aprobada" },
        select: { expediente: true },
    });
    const setExistentes = new Set(existentes.map(a => a.expediente));

    let creados = 0;
    let omitidos = 0;
    const errores: string[] = [];

    const porCrear: { expediente: string; tipoAdhesion: string }[] = [];

    for (const raw of registros) {
        const { expediente, tipoAdhesion } = extractFields(raw);
        if (!expediente) { errores.push("Fila sin expediente"); continue; }
        if (setExistentes.has(expediente)) { omitidos++; continue; }
        porCrear.push({ expediente, tipoAdhesion });
    }

    for (let i = 0; i < porCrear.length; i += BATCH) {
        try {
            const res = await prisma.adhesionDebito.createMany({
                data: porCrear.slice(i, i + BATCH).map(({ expediente, tipoAdhesion }) => ({
                    expediente,
                    tipoAdhesion,
                    estado: "aprobada",
                    terminosAceptados: true,
                })),
                skipDuplicates: true,
            });
            creados += res.count;
        } catch (e) {
            errores.push(`Lote ${i / BATCH + 1}: ${e instanceof Error ? e.message : "error"}`);
        }
    }

    return NextResponse.json({ creados, omitidos, errores });
}
