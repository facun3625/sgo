import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";
import { existsSync } from "fs";
import { join } from "path";

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

    // Buscar expediente primero en Dato, luego en User como fallback
    const datos = await prisma.dato.findMany({
        where: { cod: { in: cods } },
        select: { cod: true, expediente: true },
    });
    const codToExp = new Map<string, string>();
    for (const d of datos) {
        if (d.expediente) codToExp.set(d.cod, d.expediente);
    }

    // Para los que no tienen expediente en Dato, buscar en User
    const codsSinExp = cods.filter(c => !codToExp.has(c));
    if (codsSinExp.length > 0) {
        const users = await prisma.user.findMany({
            where: { cod: { in: codsSinExp }, expediente: { not: null } },
            select: { cod: true, expediente: true },
        });
        for (const u of users) {
            if (u.cod && u.expediente) codToExp.set(u.cod, u.expediente);
        }
    }

    // Directorio donde el admin subió los PDFs por FTP
    const uploadDir = join(process.cwd(), "public", "uploads", "boletas", tipo);

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

        const savedName = pdfName.toUpperCase();
        const filePath = join(uploadDir, savedName);
        if (!existsSync(filePath)) { sinPdf.push({ cod, pdf: pdfName, expediente }); continue; }

        records.push({
            tipo, periodo, expediente, cod, factura,
            archivo: `/uploads/boletas/${tipo}/${savedName}`,
        });
    }

    if (records.length > 0)
        await prisma.facturaSantaFe.createMany({ data: records });

    return NextResponse.json({
        ok: true, procesados: records.length, periodo,
        noEncontrados: sinExpediente.length, pdfFaltantes: sinPdf.length,
        detalle: { sinExpediente, sinPdf },
    });
}
