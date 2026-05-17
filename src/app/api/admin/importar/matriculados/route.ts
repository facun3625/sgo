import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

function parseFecha(val: string): Date | null {
    if (!val) return null;
    // dd/mm/yyyy o dd-mm-yyyy
    const m1 = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m1) {
        let [, d, mo, y] = m1;
        if (y.length === 2) y = `20${y}`;
        const date = new Date(Date.UTC(parseInt(y), parseInt(mo) - 1, parseInt(d)));
        if (!isNaN(date.getTime())) return date;
    }
    // yyyy-mm-dd
    const m2 = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m2) {
        const date = new Date(Date.UTC(parseInt(m2[1]), parseInt(m2[2]) - 1, parseInt(m2[3])));
        if (!isNaN(date.getTime())) return date;
    }
    return null;
}

function getFecha(r: Record<string, string>): Date | null {
    // acepta fechaMatriculacion o fechaInscripcion (y variantes sin tilde/espacios)
    const raw =
        r.fechaMatriculacion ||
        r.fechainscripcion ||
        r.fechaInscripcion ||
        r["fecha inscripcion"] ||
        r["fecha matriculacion"] ||
        r["fechamatric"] ||
        "";
    return raw ? parseFecha(String(raw).trim()) : null;
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { registros, modo } = await req.json() as { registros: Record<string, string>[]; modo?: string };
    if (!Array.isArray(registros) || registros.length === 0)
        return NextResponse.json({ error: "Sin registros" }, { status: 400 });

    const actualizarFecha = modo === "actualizar_fecha";

    let creados = 0;
    let actualizados = 0;
    let omitidos = 0;
    const errores: string[] = [];

    for (const r of registros) {
        const expediente = String(r.expediente ?? "").trim();
        const cod = String(r.cod ?? r.expediente ?? "").trim();

        if (!expediente) {
            omitidos++;
            continue;
        }

        const existe = await prisma.dato.findFirst({ where: { expediente } });

        if (actualizarFecha) {
            // Modo actualizar: solo pisa fechaMatriculacion si hay fecha en el archivo
            if (!existe) { omitidos++; continue; }
            const fecha = getFecha(r);
            if (!fecha) { omitidos++; continue; }
            await prisma.dato.update({ where: { id: existe.id }, data: { fechaMatriculacion: fecha } });
            actualizados++;
            continue;
        }

        // Modo crear (default)
        if (!r.apellido || !r.nombre) {
            errores.push(`Fila sin apellido/nombre — omitida (exp. ${expediente})`);
            omitidos++;
            continue;
        }

        if (existe) { omitidos++; continue; }

        try {
            await prisma.dato.create({
                data: {
                    cod,
                    apellido: String(r.apellido).trim().toUpperCase(),
                    nombre: String(r.nombre).trim().toUpperCase(),
                    expediente,
                    documento: r.documento ? String(r.documento).trim() : null,
                    tomo: r.tomo ? String(r.tomo).trim() : null,
                    folio: r.folio ? String(r.folio).trim() : null,
                    domicilioLegal: r.domicilioLegal ? String(r.domicilioLegal).trim() : null,
                    postalLegal: r.postalLegal ? String(r.postalLegal).trim() : null,
                    localidadLegal: r.localidadLegal ? String(r.localidadLegal).trim() : null,
                    telefonosLegal: r.telefonosLegal ? String(r.telefonosLegal).trim() : null,
                    emailLegal: r.emailLegal ? String(r.emailLegal).trim() : null,
                    domicilioReal: r.domicilioReal ? String(r.domicilioReal).trim() : null,
                    postalReal: r.postalReal ? String(r.postalReal).trim() : null,
                    localidadReal: r.localidadReal ? String(r.localidadReal).trim() : null,
                    provinciaReal: r.provinciaReal ? String(r.provinciaReal).trim() : null,
                    telefonosReal: r.telefonosReal ? String(r.telefonosReal).trim() : null,
                    emailReal: r.emailReal ? String(r.emailReal).trim() : null,
                    codMovilLegal: r.codMovilLegal ? String(r.codMovilLegal).trim() : null,
                    movilLegal: r.movilLegal ? String(r.movilLegal).trim() : null,
                    codMovilReal: r.codMovilReal ? String(r.codMovilReal).trim() : null,
                    movilReal: r.movilReal ? String(r.movilReal).trim() : null,
                    fechaMatriculacion: getFecha(r),
                }
            });
            creados++;
        } catch (e) {
            errores.push(`Mat. ${expediente}: ${e instanceof Error ? e.message : "error"}`);
            omitidos++;
        }
    }

    return NextResponse.json({ creados, actualizados, omitidos, errores });
}
