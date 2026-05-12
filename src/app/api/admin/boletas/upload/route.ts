import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";
import AdmZip from "adm-zip";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "superadmin"].includes(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const tipo = (formData.get("tipo") as string)?.trim();
    const file = formData.get("zip") as File | null;

    if (!tipo || !file) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    if (!["mensual", "anual", "deuda"].includes(tipo)) return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const zip = new AdmZip(Buffer.from(bytes));
    const entries = zip.getEntries();

    // Find Excel
    const xlsEntry = entries.find(e =>
        !e.isDirectory &&
        !e.entryName.startsWith("__MACOSX") &&
        /\.(xlsx|xls)$/i.test(e.entryName)
    );
    if (!xlsEntry) return NextResponse.json({ error: "No se encontró archivo Excel en el ZIP" }, { status: 400 });

    const wb = XLSX.read(xlsEntry.getData(), { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (!rawRows.length) return NextResponse.json({ error: "Excel vacío" }, { status: 400 });

    // Normalize column names to lowercase_underscore
    const rows = rawRows.map(row => {
        const out: Record<string, string> = {};
        for (const key of Object.keys(row)) {
            out[key.toLowerCase().replace(/\s+/g, "_")] = String(row[key] ?? "").trim();
        }
        return out;
    });

    const periodo = rows[0]["periodo"] ?? "";

    // Get all cod values (mensual/anual use id_cliente, deuda uses cod_cliente)
    const cods = [...new Set(
        rows.map(r => r["id_cliente"] || r["cod_cliente"] || "").filter(Boolean)
    )];

    const datos = await prisma.dato.findMany({
        where: { cod: { in: cods } },
        select: { cod: true, expediente: true },
    });
    const codToExp = new Map(datos.map(d => [d.cod, d.expediente]));

    // Build PDF map from ZIP (case-insensitive filename)
    const pdfMap = new Map<string, AdmZip.IZipEntry>();
    for (const entry of entries) {
        if (!entry.isDirectory && /\.pdf$/i.test(entry.entryName) && !entry.entryName.startsWith("__MACOSX")) {
            const filename = entry.entryName.split("/").pop()!;
            pdfMap.set(filename.toLowerCase(), entry);
        }
    }

    // Clean up previous batch files and records
    const uploadDir = join(process.cwd(), "public", "uploads", "boletas", tipo);
    if (existsSync(uploadDir)) await rm(uploadDir, { recursive: true, force: true });
    await mkdir(uploadDir, { recursive: true });
    await prisma.facturaSantaFe.deleteMany({ where: { tipo } });

    // Process rows
    const records: {
        tipo: string; periodo: string; expediente: string;
        cod: string; factura: string | null; archivo: string;
    }[] = [];
    let notFound = 0;
    let pdfMissing = 0;

    for (const row of rows) {
        const cod = row["id_cliente"] || row["cod_cliente"] || "";
        const pdfName = row["pdf"] || "";
        const factura = row["factura"] || null;

        if (!cod || !pdfName) continue;

        const expediente = codToExp.get(cod);
        if (!expediente) { notFound++; continue; }

        const entry = pdfMap.get(pdfName.toLowerCase());
        if (!entry) { pdfMissing++; continue; }

        const savedName = pdfName.toUpperCase();
        await writeFile(join(uploadDir, savedName), entry.getData());

        records.push({ tipo, periodo, expediente, cod, factura, archivo: `/uploads/boletas/${tipo}/${savedName}` });
    }

    await prisma.facturaSantaFe.createMany({ data: records });

    return NextResponse.json({ ok: true, procesados: records.length, noEncontrados: notFound, pdfFaltantes: pdfMissing, periodo });
}
