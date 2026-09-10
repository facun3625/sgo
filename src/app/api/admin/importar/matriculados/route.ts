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

function getFecha(r: Record<string, string>): Date | null {
    const raw =
        r["fechamatriculacion"] ||
        r["fechainscripcion"] ||
        r["fecha inscripcion"] ||
        r["fecha matriculacion"] ||
        r["fechamatric"] ||
        r["fecha_inscripcion"] ||
        r["fecha_matriculacion"] ||
        "";
    return raw ? parseFecha(String(raw).trim()) : null;
}

const BATCH = 200;

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { registros, modo } = await req.json() as { registros: Record<string, string>[]; modo?: string };
    if (!Array.isArray(registros) || registros.length === 0)
        return NextResponse.json({ error: "Sin registros" }, { status: 400 });

    const actualizarFecha = modo === "actualizar_fecha";

    // Traer todos los expedientes existentes de una sola query
    const expedientesEnArchivo = registros
        .map(r => String(r.expediente ?? "").trim())
        .filter(Boolean);

    const existentes = await prisma.dato.findMany({
        where: { expediente: { in: expedientesEnArchivo } },
        select: { id: true, expediente: true, fechaMatriculacion: true },
    });
    const mapaExistentes = new Map(existentes.map(d => [d.expediente, d.id]));
    const mapaFechaActual = new Map(existentes.map(d => [d.expediente, d.fechaMatriculacion]));

    let creados = 0;
    let actualizados = 0;
    let omitidos = 0;
    const errores: string[] = [];

    if (actualizarFecha) {
        // Actualizar en lotes de BATCH — solo completa la fecha si el registro
        // no tiene una cargada todavía; si ya tiene, se deja como está.
        const updates: { id: number; fecha: Date }[] = [];
        for (const r of registros) {
            const expediente = String(r.expediente ?? "").trim();
            if (!expediente) { omitidos++; continue; }
            const id = mapaExistentes.get(expediente);
            if (!id) { omitidos++; continue; }
            if (mapaFechaActual.get(expediente)) { omitidos++; continue; }
            const fecha = getFecha(r);
            if (!fecha) { omitidos++; continue; }
            updates.push({ id, fecha });
        }

        for (let i = 0; i < updates.length; i += BATCH) {
            const lote = updates.slice(i, i + BATCH);
            await Promise.all(
                lote.map(({ id, fecha }) =>
                    prisma.dato.update({ where: { id }, data: { fechaMatriculacion: fecha } })
                )
            );
            actualizados += lote.length;
        }

        return NextResponse.json({ creados: 0, actualizados, omitidos, errores });
    }

    // Modo crear: filtrar los que no existen y hacer createMany en lotes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nuevos: any[] = [];

    for (const r of registros) {
        const expediente = String(r.expediente ?? "").trim();
        const cod = String(r.cod ?? r.expediente ?? "").trim();
        if (!expediente || !r.apellido || !r.nombre) { omitidos++; continue; }
        if (mapaExistentes.has(expediente)) { omitidos++; continue; }
        nuevos.push({
            cod,
            apellido: String(r.apellido).trim().toUpperCase(),
            nombre: String(r.nombre).trim().toUpperCase(),
            expediente,
            documento: r.documento || null,
            tomo: r.tomo || null,
            folio: r.folio || null,
            domicilioLegal: r.domiciliolegal || r.domicilioLegal || null,
            postalLegal: r.postallegal || r.postalLegal || null,
            localidadLegal: r.localidadlegal || r.localidadLegal || null,
            telefonosLegal: r.telefonoslegal || r.telefonosLegal || null,
            emailLegal: r.emaillegal || r.emailLegal || null,
            domicilioReal: r.domicilioreal || r.domicilioReal || null,
            postalReal: r.postalreal || r.postalReal || null,
            localidadReal: r.localidadreal || r.localidadReal || null,
            provinciaReal: r.provinciareal || r.provinciaReal || null,
            telefonosReal: r.telefonosreal || r.telefonosReal || null,
            emailReal: r.emailreal || r.emailReal || null,
            codMovilLegal: r.codmovillegal || r.codMovilLegal || null,
            movilLegal: r.movIllegal || r.movilLegal || null,
            codMovilReal: r.codmovilreal || r.codMovilReal || null,
            movilReal: r.movilreal || r.movilReal || null,
            fechaMatriculacion: getFecha(r),
        });
    }

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

    return NextResponse.json({ creados, actualizados: 0, omitidos, errores });
}

export async function DELETE() {
    const session = await getSession();
    if (!session || session.accessLevel !== "superadmin")
        return NextResponse.json({ error: "Solo superadmin puede realizar esta operación" }, { status: 403 });

    const { count } = await prisma.dato.deleteMany({});
    return NextResponse.json({ eliminados: count });
}
