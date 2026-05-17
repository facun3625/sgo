import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";
import { readdirSync } from "node:fs";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "superadmin"].includes(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const formData = await req.formData();
    const tipo = (formData.get("tipo") as string)?.trim();
    const file = formData.get("excel") as File | null;

    if (!tipo || !file) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    if (!["mensual", "anual", "deuda"].includes(tipo)) return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const wb = XLSX.read(Buffer.from(bytes), { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (!rawRows.length) return NextResponse.json({ error: "Excel vacío" }, { status: 400 });

    // Normalizar columnas
    const rows = rawRows.map(row => {
        const out: Record<string, string> = {};
        for (const key of Object.keys(row)) {
            out[key.toLowerCase().replace(/\s+/g, "_")] = String(row[key] ?? "").trim();
        }
        return out;
    });

    const periodo = rows[0]["periodo"] ?? "";

    const cods = [...new Set(
        rows.map(r => r["id_cliente"] || r["cod_cliente"] || "").filter(Boolean)
    )];

    // Buscar expediente: por Dato.cod, Dato.expediente, User.cod, User.expediente
    const codToExp = new Map<string, string>();

    const datosByCod = await prisma.dato.findMany({
        where: { cod: { in: cods } },
        select: { cod: true, expediente: true },
    });
    for (const d of datosByCod) {
        if (d.expediente) codToExp.set(d.cod, d.expediente);
    }

    const sinMatch = cods.filter(c => !codToExp.has(c));
    if (sinMatch.length > 0) {
        // Algunos Excel usan expediente como identificador (ej: deudas)
        const datosByExp = await prisma.dato.findMany({
            where: { expediente: { in: sinMatch } },
            select: { expediente: true },
        });
        for (const d of datosByExp) {
            if (d.expediente) codToExp.set(d.expediente, d.expediente);
        }
    }

    const sinMatch2 = cods.filter(c => !codToExp.has(c));
    if (sinMatch2.length > 0) {
        const usersByCod = await prisma.user.findMany({
            where: { cod: { in: sinMatch2 }, expediente: { not: null } },
            select: { cod: true, expediente: true },
        });
        for (const u of usersByCod) {
            if (u.cod && u.expediente) codToExp.set(u.cod, u.expediente);
        }

        const sinMatch3 = sinMatch2.filter(c => !codToExp.has(c));
        if (sinMatch3.length > 0) {
            const usersByExp = await prisma.user.findMany({
                where: { expediente: { in: sinMatch3 } },
                select: { expediente: true },
            });
            for (const u of usersByExp) {
                if (u.expediente) codToExp.set(u.expediente, u.expediente);
            }
        }
    }

    // Leer directorio una sola vez — Map lowercase→nombre real para lookup case-insensitive
    const uploadDir = `${process.cwd()}/public/uploads/boletas/${tipo}`;
    const archivosEnCarpeta = new Map<string, string>();
    let debugArchivos = 0;
    let debugPrimero = "";
    try {
        const lista = readdirSync(uploadDir);
        debugArchivos = lista.length;
        debugPrimero = lista[0] ?? "";
        for (const f of lista) archivosEnCarpeta.set(f.toLowerCase(), f);
    } catch { /* carpeta vacía o no existe */ }

    // Limpiar registros anteriores del mismo tipo
    await prisma.facturaSantaFe.deleteMany({ where: { tipo } });

    const records: {
        tipo: string; periodo: string; expediente: string;
        cod: string; factura: string | null; archivo: string;
    }[] = [];
    const sinExpediente: { cod: string; pdf: string }[] = [];
    const sinPdf: { cod: string; pdf: string; expediente: string }[] = [];

    for (const row of rows) {
        const cod = row["id_cliente"] || row["cod_cliente"] || "";
        const pdfName = row["pdf"] || "";
        const factura = row["factura"] || null;

        if (!cod || !pdfName) continue;

        const expediente = codToExp.get(cod);
        if (!expediente) { sinExpediente.push({ cod, pdf: pdfName }); continue; }

        const actualName = archivosEnCarpeta.get(pdfName.toLowerCase());
        if (!actualName) { sinPdf.push({ cod, pdf: pdfName, expediente }); continue; }

        records.push({
            tipo, periodo, expediente, cod, factura,
            archivo: `/uploads/boletas/${tipo}/${actualName}`,
        });
    }

    if (records.length > 0)
        await prisma.facturaSantaFe.createMany({ data: records });

    return NextResponse.json({
        ok: true, procesados: records.length, periodo,
        noEncontrados: sinExpediente.length, pdfFaltantes: sinPdf.length,
        detalle: { sinExpediente, sinPdf },
        _debug: { uploadDir, archivosEnCarpeta: debugArchivos, primero: debugPrimero, codsEnExcel: cods.length, expedientesResueltos: codToExp.size },
    });
}
