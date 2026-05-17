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

const ACCIONES_VALIDAS = ["suspension", "cancelacion", "habilitacion"];
const STATUS_MAP: Record<string, string> = {
    suspension: "suspended",
    cancelacion: "cancelled",
    habilitacion: "active",
};

export async function GET() {
    const blob = [
        "﻿", // BOM para Excel
        "expediente,accion,comentario\n",
        "564,suspension,Importado del sistema anterior\n",
        "792,cancelacion,Baja definitiva\n",
        "831,habilitacion,Rehabilitado\n",
    ].join("");
    return new NextResponse(blob, {
        headers: {
            "Content-Type": "text/csv;charset=utf-8",
            "Content-Disposition": 'attachment; filename="plantilla_suspensiones.csv"',
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

    let procesados = 0;
    const omitidos: string[] = [];
    const errores: string[] = [];

    for (const row of registros) {
        const expediente = getCol(row, "expediente", "exp", "nro", "numero");
        if (!expediente) { errores.push("Fila sin expediente"); continue; }

        const accionRaw = getCol(row, "accion", "estado", "tipo").toLowerCase();
        if (!ACCIONES_VALIDAS.includes(accionRaw)) {
            errores.push(`Expediente ${expediente}: acción inválida "${accionRaw}" (usar suspension/cancelacion/habilitacion)`);
            continue;
        }

        const comentario = getCol(row, "comentario", "motivo", "observacion", "obs") || "Importado masivamente";
        const nuevoStatus = STATUS_MAP[accionRaw];

        const user = await prisma.user.findFirst({ where: { expediente } });
        if (!user) {
            omitidos.push(`Expediente ${expediente}: sin cuenta de usuario.`);
            continue;
        }

        await Promise.all([
            prisma.user.update({ where: { id: user.id }, data: { status: nuevoStatus } }),
            (prisma as any).historialMatricula.create({
                data: {
                    expediente,
                    accion: accionRaw,
                    comentario,
                    adminNombre: `${session.apellido}, ${session.nombre}`,
                },
            }),
        ]);

        procesados++;
    }

    return NextResponse.json({ procesados, omitidos: omitidos.length, errores: [...omitidos, ...errores] });
}
