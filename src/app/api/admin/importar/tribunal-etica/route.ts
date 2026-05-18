import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

function normalizeKey(k: string) {
    return k.toLowerCase().trim().replace(/\s*\(\d+\)$/, "");
}

function getCol(raw: Record<string, string>, ...keys: string[]): string {
    const row = Object.fromEntries(Object.entries(raw).map(([k, v]) => [normalizeKey(k), v]));
    for (const k of keys) {
        const val = row[k] ?? "";
        if (val) return val.trim();
    }
    return "";
}

function parseDate(raw: string): Date | null {
    if (!raw?.trim()) return null;
    // Soporta dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd
    const s = raw.trim();
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) return new Date(Date.UTC(+dmy[3], +dmy[2] - 1, +dmy[1]));
    const iso = s.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
    if (iso) return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

const BATCH = 200;

export async function GET() {
    const blob = [
        "﻿",
        "expediente,texto,inicio,fin\n",
        "564,Apercibimiento por conducta contraria a la ética,15/03/2020,\n",
        "792,Suspensión por 6 meses,01/06/2019,01/12/2019\n",
        "831,Advertencia pública,10/01/2022,\n",
    ].join("");
    return new NextResponse(blob, {
        headers: {
            "Content-Type": "text/csv;charset=utf-8",
            "Content-Disposition": 'attachment; filename="plantilla_tribunal_etica.csv"',
        },
    });
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { registros } = await req.json() as { registros: Record<string, string>[] };
    if (!Array.isArray(registros) || registros.length === 0)
        return NextResponse.json({ error: "Sin registros" }, { status: 400 });

    let creados = 0;
    const errores: string[] = [];
    const porCrear: { expediente: string; texto: string; inicio: Date | null; fin: Date | null }[] = [];

    for (let i = 0; i < registros.length; i++) {
        const raw = registros[i];
        const expediente = getCol(raw, "expediente", "exp", "nro", "numero");
        const texto = getCol(raw, "texto", "motivo", "descripcion", "sancion", "detalle");
        const inicioRaw = getCol(raw, "inicio", "fecha_inicio", "fechainicio", "fecha");
        const finRaw = getCol(raw, "fin", "fecha_fin", "fechafin");

        if (!expediente) { errores.push(`Fila ${i + 1}: sin expediente`); continue; }
        if (!texto) { errores.push(`Fila ${i + 1} (exp ${expediente}): sin texto/motivo`); continue; }

        const inicio = parseDate(inicioRaw);
        if (inicioRaw && !inicio) errores.push(`Fila ${i + 1} (exp ${expediente}): fecha de inicio inválida "${inicioRaw}" — se importa sin fecha`);

        const fin = finRaw ? parseDate(finRaw) : null;
        if (finRaw && !fin) { errores.push(`Fila ${i + 1} (exp ${expediente}): fecha de fin inválida "${finRaw}"`); continue; }

        porCrear.push({ expediente, texto, inicio, fin });
    }

    for (let i = 0; i < porCrear.length; i += BATCH) {
        try {
            const res = await prisma.tribunalEtica.createMany({
                data: porCrear.slice(i, i + BATCH).map(r => ({
                    expediente: r.expediente,
                    texto: r.texto,
                    inicio: r.inicio ?? undefined,
                    fin: r.fin ?? undefined,
                })),
            });
            creados += res.count;
        } catch (e) {
            errores.push(`Lote ${Math.floor(i / BATCH) + 1}: ${e instanceof Error ? e.message : "error"}`);
        }
    }

    return NextResponse.json({ creados, errores });
}
