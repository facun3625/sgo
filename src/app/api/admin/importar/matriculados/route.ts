import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { registros } = await req.json();
    if (!Array.isArray(registros) || registros.length === 0)
        return NextResponse.json({ error: "Sin registros" }, { status: 400 });

    let creados = 0;
    let omitidos = 0;
    const errores: string[] = [];

    for (const r of registros) {
        const expediente = String(r.expediente ?? "").trim();
        const cod = String(r.cod ?? r.expediente ?? "").trim();

        if (!expediente || !r.apellido || !r.nombre) {
            errores.push(`Fila sin expediente/apellido/nombre — omitida`);
            omitidos++;
            continue;
        }

        // Si ya existe en Dato, omitir
        const existe = await prisma.dato.findFirst({ where: { expediente } });
        if (existe) {
            omitidos++;
            continue;
        }

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
                    fechaMatriculacion: r.fechaMatriculacion ? new Date(r.fechaMatriculacion) : null,
                }
            });
            creados++;
        } catch (e) {
            errores.push(`Mat. ${expediente}: ${e instanceof Error ? e.message : "error"}`);
            omitidos++;
        }
    }

    return NextResponse.json({ creados, omitidos, errores });
}
