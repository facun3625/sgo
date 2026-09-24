import fs from "fs/promises";
import path from "path";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import { procesarRegistrosDeudas } from "@/lib/importarDeudas";
import { notificarAdmins } from "@/lib/notificaciones";

// Carpeta que matriculación sube por SFTP (mismo usuario/chroot ya usado para
// boletas, ver docs/troubleshooting-ftp-boletas.md) — se agrega como carpeta
// hermana de /boletas/ dentro de /root/sgo/public/uploads/, con dueño
// boletas:boletas. La app (corre como root) NUNCA crea ni recrea esta carpeta
// padre: si no existe, es porque falta el paso de setup por SSH — recrearla
// desde acá la dejaría root:root y rompería la escritura por FTP (mismo bug
// documentado para /boletas/<tipo>).
const DIR = path.join(process.cwd(), "public/uploads/importar/deudas");
const PROCESADOS_DIR = path.join(DIR, "procesados");
const EXTENSIONES_VALIDAS = [".xlsx", ".xls", ".csv"];

function excelValToString(val: unknown): string {
    if (val instanceof Date) {
        if (isNaN(val.getTime()) || val.getTime() <= 0) return "";
        const d = val.getUTCDate().toString().padStart(2, "0");
        const m = (val.getUTCMonth() + 1).toString().padStart(2, "0");
        return `${d}/${m}/${val.getUTCFullYear()}`;
    }
    return String(val ?? "").trim();
}

function parseCsvBuffer(buffer: Buffer): Record<string, string>[] {
    const text = buffer.toString("utf-8");
    const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const sep = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
    return lines.slice(1).map(line => {
        const values = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
        return row;
    });
}

function parseExcelBuffer(buffer: Buffer): Record<string, string>[] {
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    return rows.map(row => {
        const normalized: Record<string, string> = {};
        for (const key of Object.keys(row)) {
            normalized[key.toLowerCase().trim()] = excelValToString(row[key]);
        }
        return normalized;
    });
}

function parseArchivo(buffer: Buffer, nombre: string): Record<string, string>[] {
    return nombre.toLowerCase().endsWith(".csv") ? parseCsvBuffer(buffer) : parseExcelBuffer(buffer);
}

async function registrarLog(archivo: string, estado: "exitoso" | "error", filas: number, mensaje: string) {
    await prisma.importacionAutomatica.create({
        data: { tipo: "deudas", archivo, estado, filas, mensaje },
    }).catch(err => console.error("[ftp-import] No se pudo guardar el log:", err));
}

async function procesarArchivo(nombre: string) {
    const rutaOrigen = path.join(DIR, nombre);
    try {
        const buffer = await fs.readFile(rutaOrigen);
        const registros = parseArchivo(buffer, nombre);
        if (registros.length === 0) throw new Error("El archivo no tiene filas de datos legibles.");

        const resultado = await procesarRegistrosDeudas(registros);
        if (!resultado.ok) throw new Error(resultado.error);

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        await fs.rename(rutaOrigen, path.join(PROCESADOS_DIR, `${timestamp}__${nombre}`));

        await registrarLog(
            nombre, "exitoso", resultado.actualizados,
            `${resultado.actualizados} expedientes actualizados (${resultado.comprobantes} comprobantes).`
        );
        console.log(`[ftp-import] "${nombre}" procesado: ${resultado.actualizados} expedientes.`);
    } catch (err) {
        const mensaje = err instanceof Error ? err.message : "Error desconocido";
        console.error(`[ftp-import] Error procesando "${nombre}":`, err);
        await registrarLog(nombre, "error", 0, mensaje);
        await notificarAdmins(
            "Error en importación automática de deudas",
            `No se pudo procesar "${nombre}" desde la carpeta FTP: ${mensaje}. El archivo quedó en la carpeta para revisión — podés importarlo a mano desde Importar Datos.`,
            "admin_import"
        ).catch(err2 => console.error("[ftp-import] No se pudo notificar a los admins:", err2));
        // El archivo se deja donde está (no se mueve a procesados) para poder
        // inspeccionarlo o reintentar a mano.
    }
}

// Se llama cada 45 min desde src/instrumentation.ts. Revisa la carpeta de FTP y
// procesa cualquier archivo nuevo encontrado, uno por uno, en orden alfabético.
export async function chequearFtpDeudas() {
    try {
        await fs.access(DIR);
    } catch {
        // No existe todavía — falta el paso de setup por SSH (mkdir + chown
        // boletas:boletas). No es un error del watcher, solo no hay nada que hacer.
        return;
    }
    await fs.mkdir(PROCESADOS_DIR, { recursive: true }).catch(() => {});

    const entries = await fs.readdir(DIR, { withFileTypes: true });
    const archivos = entries
        .filter(e => e.isFile() && !e.name.startsWith(".") && EXTENSIONES_VALIDAS.includes(path.extname(e.name).toLowerCase()))
        .map(e => e.name)
        .sort();

    for (const nombre of archivos) {
        await procesarArchivo(nombre);
    }
}
