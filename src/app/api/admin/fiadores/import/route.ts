import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

const BATCH = 200;

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "superadmin"].includes(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const rows: { expediente: string; fiador: string }[] = body.registros ?? [];

    const errores: string[] = [];
    type RowValida = { expediente: string; fiadorExpediente: string };
    const rowsValidas: RowValida[] = [];

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
        rowsValidas.push({ expediente, fiadorExpediente });
    }

    if (rowsValidas.length === 0)
        return NextResponse.json({ creados: 0, reemplazados: 0, omitidos: 0, errores });

    // Fetch existing fiadores upfront
    const expedientesArchivo = rowsValidas.map(r => r.expediente);
    const existentes = await prisma.fiador.findMany({
        where: { expediente: { in: expedientesArchivo } },
        select: { expediente: true, fiadorExpediente: true },
    });
    const mapExistentes = new Map(existentes.map(f => [f.expediente, f.fiadorExpediente]));

    let creados = 0;
    let reemplazados = 0;
    let omitidos = 0;

    type UpsertItem = { expediente: string; fiadorExpediente: string; isNew: boolean };
    const porUpsert: UpsertItem[] = [];

    for (const { expediente, fiadorExpediente } of rowsValidas) {
        const existing = mapExistentes.get(expediente);
        if (existing === undefined) {
            porUpsert.push({ expediente, fiadorExpediente, isNew: true });
        } else if (existing === fiadorExpediente) {
            omitidos++;
        } else {
            porUpsert.push({ expediente, fiadorExpediente, isNew: false });
        }
    }

    // Batch upserts
    for (let i = 0; i < porUpsert.length; i += BATCH) {
        const lote = porUpsert.slice(i, i + BATCH);
        const results = await Promise.allSettled(lote.map(({ expediente, fiadorExpediente }) =>
            prisma.fiador.upsert({
                where: { expediente },
                create: { expediente, fiadorExpediente },
                update: { fiadorExpediente },
            })
        ));
        for (let j = 0; j < results.length; j++) {
            const r = results[j];
            if (r.status === "fulfilled") {
                if (porUpsert[i + j].isNew) creados++; else reemplazados++;
            } else {
                errores.push(`Expediente ${porUpsert[i + j].expediente}: ${(r.reason as Error).message}`);
            }
        }
    }

    return NextResponse.json({ creados, reemplazados, omitidos, errores });
}
