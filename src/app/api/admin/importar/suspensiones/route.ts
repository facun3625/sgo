import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revocarAccesoCatastro } from "@/lib/catastro";
import * as XLSX from "xlsx";

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

const BATCH = 200;

export async function GET() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
        ["expediente", "accion", "comentario", "motivo"],
        ["564", "suspension", "Importado del sistema anterior", "Falta de Pago"],
        ["792", "cancelacion", "Baja definitiva", "Fallecimiento"],
        ["831", "habilitacion", "Rehabilitado", ""],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": 'attachment; filename="plantilla_suspensiones.xlsx"',
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

    const adminNombre = `${session.apellido}, ${session.nombre}`;

    // Validate rows and collect valid expedientes
    type RowValida = { expediente: string; accionRaw: string; comentario: string; motivoNombreRaw: string };
    const rowsValidas: RowValida[] = [];
    const errores: string[] = [];

    for (const row of registros) {
        const expediente = getCol(row, "expediente", "exp", "nro", "numero");
        if (!expediente) { errores.push("Fila sin expediente"); continue; }

        const accionRaw = getCol(row, "accion", "estado", "tipo").toLowerCase();
        if (!ACCIONES_VALIDAS.includes(accionRaw)) {
            errores.push(`Expediente ${expediente}: acción inválida "${accionRaw}" (usar suspension/cancelacion/habilitacion)`);
            continue;
        }

        const comentario = getCol(row, "comentario", "observacion", "obs") || "Importado masivamente";
        const motivoNombreRaw = getCol(row, "motivo", "motivo_suspension", "motivosuspension");
        rowsValidas.push({ expediente, accionRaw, comentario, motivoNombreRaw });
    }

    if (rowsValidas.length === 0)
        return NextResponse.json({ procesados: 0, omitidos: 0, errores });

    // Fetch all users and motivos upfront
    const expedientesArchivo = rowsValidas.map(r => r.expediente);
    const [usuarios, motivosDB] = await Promise.all([
        prisma.user.findMany({
            where: { expediente: { in: expedientesArchivo } },
            select: { id: true, expediente: true },
        }),
        prisma.motivoSuspension.findMany({ where: { activo: true } }),
    ]);
    const mapExpUser = new Map(usuarios.map(u => [u.expediente, u.id]));
    // Mapa nombre normalizado → motivo
    const mapMotivos = new Map(motivosDB.map(m => [m.nombre.toLowerCase().trim(), m]));

    const omitidos: string[] = [];
    type AccionItem = { userId: number; expediente: string; nuevoStatus: string; accionRaw: string; comentario: string; motivoId: number | null; motivoNombre: string | null; motivoCobra: boolean | null };
    const porProcesar: AccionItem[] = [];

    for (const { expediente, accionRaw, comentario, motivoNombreRaw } of rowsValidas) {
        const userId = mapExpUser.get(expediente);
        if (!userId) { omitidos.push(`Expediente ${expediente}: sin cuenta de usuario.`); continue; }

        const motivo = motivoNombreRaw ? mapMotivos.get(motivoNombreRaw.toLowerCase().trim()) ?? null : null;
        if (motivoNombreRaw && !motivo) {
            errores.push(`Expediente ${expediente}: motivo "${motivoNombreRaw}" no encontrado — se importa sin motivo.`);
        }

        porProcesar.push({
            userId, expediente,
            nuevoStatus: STATUS_MAP[accionRaw],
            accionRaw, comentario,
            motivoId: motivo?.id ?? null,
            motivoNombre: motivo?.nombre ?? null,
            motivoCobra: motivo?.aplicaMulta ?? null,
        });
    }

    // Batch updates
    for (let i = 0; i < porProcesar.length; i += BATCH) {
        const lote = porProcesar.slice(i, i + BATCH);
        await Promise.all(lote.map(({ userId, nuevoStatus }) =>
            prisma.user.update({ where: { id: userId }, data: { status: nuevoStatus } })
        ));
        await Promise.all(lote.map(({ expediente, accionRaw, comentario, motivoId, motivoNombre, motivoCobra }) =>
            (prisma as any).historialMatricula.create({
                data: { expediente, accion: accionRaw, comentario, adminNombre, motivoId, motivoNombre, motivoCobra },
            })
        ));
        // Revocar acceso CATASTRO para suspendidos/cancelados
        for (const { expediente, nuevoStatus } of lote) {
            if (nuevoStatus === "suspended" || nuevoStatus === "cancelled") {
                await revocarAccesoCatastro(expediente, nuevoStatus === "cancelled" ? "cancelacion" : "suspension");
            }
        }
    }

    return NextResponse.json({ procesados: porProcesar.length, omitidos: omitidos.length, errores: [...omitidos, ...errores] });
}
