export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

function parseFecha(val: string): Date | null {
    if (!val) return null;
    const m1 = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m1) {
        let [, d, mo, y] = m1;
        if (y.length === 2) y = `20${y}`;
        const date = new Date(Date.UTC(parseInt(y), parseInt(mo) - 1, parseInt(d)));
        if (!isNaN(date.getTime())) return date;
    }
    const m2 = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m2) {
        const date = new Date(Date.UTC(parseInt(m2[1]), parseInt(m2[2]) - 1, parseInt(m2[3])));
        if (!isNaN(date.getTime())) return date;
    }
    return null;
}

function get(r: Record<string, string>, ...keys: string[]): string {
    for (const k of keys) {
        const v = r[k.toLowerCase()];
        if (v !== undefined && v !== "") return v.trim();
    }
    return "";
}

const BATCH = 100;

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { registros } = await req.json() as { registros: Record<string, string>[] };
    if (!Array.isArray(registros) || registros.length === 0)
        return NextResponse.json({ error: "Sin registros" }, { status: 400 });

    const expedientesEnArchivo = registros
        .map(r => get(r, "expediente").trim())
        .filter(Boolean);

    const existentes = await prisma.dato.findMany({
        where: { expediente: { in: expedientesEnArchivo } },
        select: { expediente: true },
    });
    const setExistentes = new Set(existentes.map(d => d.expediente));

    const yaExistentes: string[] = [];
    const nuevos: any[] = [];
    const fiadores: { expediente: string; fiadorExpediente: string }[] = [];

    for (const r of registros) {
        const expediente = get(r, "expediente");
        if (!expediente) continue;

        // Split "Apellido y Nombre" por primera coma
        const apellidoNombre = get(r, "apellido y nombre", "apellido y nombre completo");
        const commaIdx = apellidoNombre.indexOf(",");
        const apellido = commaIdx >= 0 ? apellidoNombre.slice(0, commaIdx).trim() : apellidoNombre.trim();
        const nombre = commaIdx >= 0 ? apellidoNombre.slice(commaIdx + 1).trim() : "";

        if (!apellido) continue;

        if (setExistentes.has(expediente)) {
            yaExistentes.push(expediente);
            continue;
        }

        const codCliente = get(r, "cod cliente", "cod_cliente", "codcliente", "codigo cliente");
        const cod = codCliente || expediente;

        nuevos.push({
            cod,
            expediente,
            apellido: apellido.toUpperCase(),
            nombre: nombre.toUpperCase(),
            documento: get(r, "documento") || null,
            tomo: get(r, "tomo") || null,
            folio: get(r, "folio") || null,
            domicilioLegal: get(r, "domicilio legal", "domicilio lega", "domiciliolegal") || null,
            postalLegal: get(r, "código legal", "codigo legal", "codigo_legal", "código_legal", "codigolegal") || null,
            localidadLegal: get(r, "localidad legal", "localidad leg", "localidadlegal") || null,
            telefonosLegal: get(r, "teléfono legal", "telefono legal", "telefonolegal") || null,
            emailLegal: get(r, "email") || null,
            domicilioReal: get(r, "domicilio real", "domicilioreal") || null,
            postalReal: get(r, "código real", "codigo real", "codigo_real", "codigoreal") || null,
            localidadReal: get(r, "localidad real", "localidadreal") || null,
            provinciaReal: get(r, "provincia real", "provinciareal") || null,
            telefonosReal: get(r, "teléfono real", "telefono real", "telefonoreal") || null,
            fechaMatriculacion: parseFecha(get(r, "fecha de inscripción", "fecha de inscripcion", "inscripción", "inscripcion", "fecha inscripcion")),
        });

        // Fiador
        const fiadorExp = get(r, "expediente fi", "expediente fiador", "expediente_fi", "expedientefi");
        if (fiadorExp && expediente) {
            fiadores.push({ expediente, fiadorExpediente: fiadorExp });
        }
    }

    let creados = 0;
    const errores: string[] = [];

    for (let i = 0; i < nuevos.length; i += BATCH) {
        try {
            const res = await prisma.dato.createMany({
                data: nuevos.slice(i, i + BATCH),
                skipDuplicates: true,
            });
            creados += res.count;
        } catch (e) {
            errores.push(`Lote ${i / BATCH + 1}: ${e instanceof Error ? e.message : "error"}`);
        }
    }

    // Fiadores — solo insertar si el expediente del matriculado fue creado
    const expedientesCreados = new Set(nuevos.map(n => n.expediente));
    let fiadoresCreados = 0;
    for (const f of fiadores) {
        if (!expedientesCreados.has(f.expediente)) continue;
        try {
            await prisma.fiador.upsert({
                where: { expediente: f.expediente },
                update: { fiadorExpediente: f.fiadorExpediente },
                create: { expediente: f.expediente, fiadorExpediente: f.fiadorExpediente },
            });
            fiadoresCreados++;
        } catch { /* ignorar errores individuales de fiador */ }
    }

    return NextResponse.json({ creados, yaExistentes, fiadoresCreados, errores });
}
