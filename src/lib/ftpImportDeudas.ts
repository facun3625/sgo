import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import { procesarRegistrosDeudas } from "@/lib/importarDeudas";
import { notificarAdmins } from "@/lib/notificaciones";
import { parseCsv } from "@/lib/parseCsv";

// Carpeta que matriculación sube por SFTP. El directorio padre debe crearse por
// SSH con dueño boletas:boletas; la aplicación solo crea sus subdirectorios.
const DIR = path.join(process.cwd(), "public/uploads/importar/deudas");
const PROCESANDO_DIR = path.join(DIR, "procesando");
const PROCESADOS_DIR = path.join(DIR, "procesados");
const ERRORES_DIR = path.join(DIR, "errores");
const LOCK_DIR = path.join(DIR, ".watcher.lock");
const EXTENSIONES_VALIDAS = [".xlsx", ".xls", ".csv"];
const EDAD_MINIMA_MS = 60_000;
const LOCK_OBSOLETO_MS = 2 * 60 * 60 * 1000;
// Si matriculación sube el archivo varias veces por día (no solo una vez al
// mes), procesados/ puede acumular cientos de archivos — se limpian solos los
// que ya pasaron esta ventana. errores/ no se toca: esos necesitan que
// alguien los revise antes de que desaparezcan.
const RETENCION_PROCESADOS_MS = 30 * 24 * 60 * 60 * 1000;

type ArchivoPendiente = {
    ruta: string;
    nombreOriginal: string;
    fechaMs: number;
    size: number;
    yaReclamado: boolean;
};

function excelValToString(val: unknown): string {
    if (val instanceof Date) {
        if (isNaN(val.getTime()) || val.getTime() <= 0) return "";
        const d = val.getUTCDate().toString().padStart(2, "0");
        const m = (val.getUTCMonth() + 1).toString().padStart(2, "0");
        return `${d}/${m}/${val.getUTCFullYear()}`;
    }
    return String(val ?? "").trim();
}

function parseExcelBuffer(buffer: Buffer): Record<string, string>[] {
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return [];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    return rows.map(row => {
        const normalized: Record<string, string> = {};
        for (const key of Object.keys(row)) normalized[key.toLowerCase().trim()] = excelValToString(row[key]);
        return normalized;
    });
}

function parseArchivo(buffer: Buffer, nombre: string): Record<string, string>[] {
    return nombre.toLowerCase().endsWith(".csv") ? parseCsv(buffer.toString("utf-8")) : parseExcelBuffer(buffer);
}

async function registrarLog(archivo: string, estado: "exitoso" | "error", filas: number, mensaje: string) {
    await prisma.importacionAutomatica.create({
        data: { tipo: "deudas", archivo, estado, filas, mensaje },
    }).catch(err => console.error("[ftp-import] No se pudo guardar el log:", err));
}

function nombreArchivado(nombreOriginal: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `${timestamp}__${randomUUID()}__${nombreOriginal}`;
}

function nombreOriginalDeReclamado(nombre: string) {
    const partes = nombre.split("__");
    return partes.length >= 3 ? partes.slice(2).join("__") : nombre;
}

// Recupera la fecha de archivado desde el prefijo que le puso nombreArchivado()
// (ej. "2026-10-20T16-41-49-352Z__<uuid>__original.xlsx") — así la retención
// depende de cuándo se procesó, no del mtime del archivo (que puede arrastrar
// la fecha original de subida tras el rename).
function fechaDeArchivado(nombre: string): number | null {
    const m = nombre.match(/^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)__/);
    if (!m) return null;
    const iso = m[1].replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, "T$1:$2:$3.$4Z");
    const t = Date.parse(iso);
    return isNaN(t) ? null : t;
}

async function limpiarProcesadosViejos(): Promise<void> {
    const entries = await fs.readdir(PROCESADOS_DIR, { withFileTypes: true }).catch(() => []);
    const limite = Date.now() - RETENCION_PROCESADOS_MS;
    for (const entry of entries) {
        if (!entry.isFile()) continue;
        const fecha = fechaDeArchivado(entry.name);
        if (fecha !== null && fecha < limite) {
            await fs.unlink(path.join(PROCESADOS_DIR, entry.name))
                .catch(err => console.error(`[ftp-import] No se pudo borrar "${entry.name}" de procesados:`, err));
        }
    }
}

async function procesarArchivo(rutaReclamada: string, nombreOriginal: string) {
    let filasLeidas = 0;
    let datosAplicados = false;
    try {
        const buffer = await fs.readFile(rutaReclamada);
        const registros = parseArchivo(buffer, nombreOriginal);
        filasLeidas = registros.length;
        if (registros.length === 0) throw new Error("El archivo no tiene filas de datos legibles.");

        const resultado = await procesarRegistrosDeudas(registros);
        if (!resultado.ok) throw new Error(resultado.error);
        datosAplicados = true;

        await fs.rename(rutaReclamada, path.join(PROCESADOS_DIR, nombreArchivado(nombreOriginal)));

        const { posiblesRecobros } = resultado;
        const avisoRecobros = posiblesRecobros.length > 0
            ? ` ⚠ ${posiblesRecobros.length} expediente${posiblesRecobros.length > 1 ? "s" : ""} con un pago reciente en SGO vuelve${posiblesRecobros.length > 1 ? "n" : ""} a aparecer con deuda — revisar si el sistema contable ya reflejó esos pagos.`
            : "";
        await registrarLog(
            nombreOriginal, "exitoso", resultado.actualizados,
            `${resultado.actualizados} expedientes actualizados (${resultado.comprobantes} comprobantes).${avisoRecobros}`
        );
        console.log(`[ftp-import] "${nombreOriginal}" procesado: ${resultado.actualizados} expedientes.`);

        if (posiblesRecobros.length > 0) {
            const detalle = posiblesRecobros.slice(0, 15)
                .map(r => `Exp. ${r.expediente} ($${r.monto.toLocaleString("es-AR")} vía ${r.metodoPago}, ${r.fechaPago.toLocaleDateString("es-AR")})`)
                .join("; ");
            await notificarAdmins(
                "Revisar: posibles deudas recargadas en el import automático",
                `El archivo "${nombreOriginal}" volvió a cargar deuda para ${posiblesRecobros.length} expediente${posiblesRecobros.length > 1 ? "s" : ""} que ya registra${posiblesRecobros.length > 1 ? "n" : ""} un pago reciente en SGO: ${detalle}${posiblesRecobros.length > 15 ? "; ..." : ""}. Puede ser que el sistema contable todavía no haya reflejado esos pagos.`,
                "admin_import"
            ).catch(err => console.error("[ftp-import] No se pudo notificar posibles recobros:", err));
        }
    } catch (err) {
        const detalle = err instanceof Error ? err.message : "Error desconocido";
        const mensaje = datosAplicados
            ? `Los datos se aplicaron, pero no se pudo archivar el archivo: ${detalle}`
            : detalle;
        console.error(`[ftp-import] Error procesando "${nombreOriginal}":`, err);
        let movidoAErrores = true;
        await fs.rename(rutaReclamada, path.join(ERRORES_DIR, nombreArchivado(nombreOriginal))).catch(errMover => {
            movidoAErrores = false;
            console.error(`[ftp-import] No se pudo mover "${nombreOriginal}" a errores:`, errMover);
        });
        await registrarLog(nombreOriginal, "error", filasLeidas, mensaje);
        await notificarAdmins(
            "Error en importación automática de deudas",
            `No se pudo completar "${nombreOriginal}" desde la carpeta FTP: ${mensaje}. ${movidoAErrores ? "El archivo se movió a la carpeta errores para revisión; corregilo y volvé a subirlo." : "Además, no se pudo mover el archivo a la carpeta errores; revisá los permisos de las carpetas."}`,
            "admin_import"
        ).catch(err2 => console.error("[ftp-import] No se pudo notificar a los admins:", err2));
    }
}

async function adquirirLock(): Promise<boolean> {
    try {
        await fs.mkdir(LOCK_DIR);
        return true;
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
        const stat = await fs.stat(LOCK_DIR).catch(() => null);
        if (!stat || Date.now() - stat.mtimeMs <= LOCK_OBSOLETO_MS) return false;
        await fs.rm(LOCK_DIR, { recursive: true, force: true });
        try {
            await fs.mkdir(LOCK_DIR);
            return true;
        } catch (retryErr) {
            if ((retryErr as NodeJS.ErrnoException).code === "EEXIST") return false;
            throw retryErr;
        }
    }
}

async function listarPendientes(): Promise<ArchivoPendiente[]> {
    const ahora = Date.now();
    const pendientes: ArchivoPendiente[] = [];

    // Si el proceso cayó después de reclamar un archivo, se retoma antes de los nuevos.
    const reclamados = await fs.readdir(PROCESANDO_DIR, { withFileTypes: true });
    for (const entry of reclamados) {
        if (!entry.isFile()) continue;
        const ruta = path.join(PROCESANDO_DIR, entry.name);
        const stat = await fs.stat(ruta);
        pendientes.push({
            ruta,
            nombreOriginal: nombreOriginalDeReclamado(entry.name),
            fechaMs: stat.mtimeMs,
            size: stat.size,
            yaReclamado: true,
        });
    }

    const entries = await fs.readdir(DIR, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isFile() || entry.name.startsWith(".") || !EXTENSIONES_VALIDAS.includes(path.extname(entry.name).toLowerCase())) continue;
        const ruta = path.join(DIR, entry.name);
        const stat = await fs.stat(ruta);
        // Evita tomar un archivo que SFTP todavía está escribiendo.
        if (ahora - stat.mtimeMs < EDAD_MINIMA_MS) continue;
        pendientes.push({ ruta, nombreOriginal: entry.name, fechaMs: stat.mtimeMs, size: stat.size, yaReclamado: false });
    }

    // Se procesa del más viejo al más nuevo. Como cada archivo es un reemplazo
    // total, el archivo subido/modificado más recientemente queda vigente.
    return pendientes.sort((a, b) => a.fechaMs - b.fechaMs || a.nombreOriginal.localeCompare(b.nombreOriginal));
}

// Se llama cada 45 min desde instrumentation. Un lock de filesystem evita que
// dos workers recorran la carpeta al mismo tiempo; el lock de PostgreSQL en la
// importación también la serializa frente al import manual.
export async function chequearFtpDeudas() {
    try {
        await fs.access(DIR);
    } catch {
        return;
    }

    await Promise.all([
        fs.mkdir(PROCESANDO_DIR, { recursive: true }),
        fs.mkdir(PROCESADOS_DIR, { recursive: true }),
        fs.mkdir(ERRORES_DIR, { recursive: true }),
    ]);

    if (!await adquirirLock()) return;
    try {
        const archivos = await listarPendientes();
        for (const archivo of archivos) {
            let rutaReclamada = archivo.ruta;
            if (!archivo.yaReclamado) {
                // Segunda comprobación justo antes del rename: además de tener un
                // minuto de antigüedad, tamaño y mtime deben seguir sin cambios.
                const statActual = await fs.stat(archivo.ruta).catch(() => null);
                if (!statActual || statActual.size !== archivo.size || statActual.mtimeMs !== archivo.fechaMs) continue;
                rutaReclamada = path.join(PROCESANDO_DIR, `${Date.now()}__${randomUUID()}__${archivo.nombreOriginal}`);
                try {
                    await fs.rename(archivo.ruta, rutaReclamada);
                } catch (err) {
                    if ((err as NodeJS.ErrnoException).code === "ENOENT") continue;
                    throw err;
                }
            }
            await procesarArchivo(rutaReclamada, archivo.nombreOriginal);
        }
        await limpiarProcesadosViejos();
    } finally {
        await fs.rm(LOCK_DIR, { recursive: true, force: true });
    }
}
