import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

function extractFields(raw: Record<string, string>): { expediente: string; password: string } {
    const row = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k.toLowerCase().trim().replace(/\s*\(\d+\)$/, ""), v])
    );
    const expediente = (
        row["expediente"] || row["usuario_sistema"] || row["usuario"] ||
        row["exp"] || row["nro"] || row["numero"] || row["cod"] || ""
    ).trim();
    let password = (
        row["password"] || row["contraseña"] || row["pass"] ||
        row["hash"] || row["clave"] || row["__empty"] || ""
    ).trim();
    if (!password) {
        for (const val of Object.values(row)) {
            if (val.startsWith("$2")) { password = val; break; }
        }
    }
    return { expediente, password };
}

const BATCH = 100;

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

    // Una sola query para saber cuáles ya tienen cuenta
    const [usuariosExistentes, datosExistentes] = await Promise.all([
        prisma.user.findMany({
            where: { expediente: { in: expedientesArchivo } },
            select: { expediente: true },
        }),
        prisma.dato.findMany({
            where: { expediente: { in: expedientesArchivo } },
            select: { expediente: true, cod: true, apellido: true, nombre: true, documento: true },
        }),
    ]);

    const setUsuarios = new Set(usuariosExistentes.map(u => u.expediente));
    const mapDatos = new Map(datosExistentes.map(d => [d.expediente, d]));

    let creados = 0;
    let omitidos = 0;
    const errores: string[] = [];

    // Preparar registros a crear (el hash bcrypt requiere procesamiento individual)
    const porCrear: { expediente: string; password: string; dato: typeof datosExistentes[0] }[] = [];

    for (const raw of registros) {
        const { expediente, password: rawPassword } = extractFields(raw);
        if (!expediente) { errores.push("Fila sin expediente"); continue; }
        if (setUsuarios.has(expediente)) { omitidos++; continue; }
        const dato = mapDatos.get(expediente);
        if (!dato) { errores.push(`Expediente ${expediente}: no encontrado en datos`); continue; }
        porCrear.push({ expediente, password: rawPassword, dato });
    }

    // Procesar en lotes (el hash puede ser costoso)
    for (let i = 0; i < porCrear.length; i += BATCH) {
        const lote = porCrear.slice(i, i + BATCH);
        await Promise.all(lote.map(async ({ expediente, password: rawPassword, dato }) => {
            try {
                const passValue = rawPassword || dato.documento || expediente;
                const hashed = passValue.startsWith("$2")
                    ? passValue.replace(/^\$2y\$/, "$2b$")
                    : await bcrypt.hash(passValue, 10);
                await prisma.user.create({
                    data: {
                        expediente,
                        cod: dato.cod,
                        apellido: dato.apellido,
                        nombre: dato.nombre,
                        password: hashed,
                        status: "active",
                        accessLevel: "user",
                        registered: 1,
                    },
                });
                creados++;
            } catch (e: any) {
                errores.push(`Expediente ${expediente}: ${e?.message?.includes("Unique") ? "cod duplicado" : "error al crear"}`);
            }
        }));
    }

    return NextResponse.json({ creados, omitidos, errores });
}
