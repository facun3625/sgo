import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

const PLANTILLAS: Record<string, { filename: string; content: string }> = {
    matriculados: {
        filename: "plantilla_matriculados.csv",
        content: "expediente,cod,apellido,nombre,documento,tomo,folio,domicilioLegal,postalLegal,localidadLegal,telefonosLegal,emailLegal,domicilioReal,postalReal,localidadReal,provinciaReal,telefonosReal,emailReal,codMovilLegal,movilLegal,codMovilReal,movilReal,fechaMatriculacion\n564,564,GARCIA,JUAN,12345678,1,100,AV SAN MARTIN 123,3000,SANTA FE,0342-123456,juan@email.com,,,,,,,,,,,"
    },
    deudas: {
        filename: "plantilla_deudas.csv",
        content: "expediente,monto\n564,15000\n792,8500"
    },
    matriculaAnual: {
        filename: "plantilla_matricula_anual.csv",
        content: "expediente,monto\n564,48000\n792,48000"
    },
    matriculaMensual: {
        filename: "plantilla_matricula_mensual.csv",
        content: "expediente,monto\n564,4500\n792,4500"
    },
    pagoAnual: {
        filename: "plantilla_pago_anual.csv",
        content: "expediente\n564\n792"
    },
};

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const tipo = req.nextUrl.searchParams.get("tipo") ?? "";
    const plantilla = PLANTILLAS[tipo];
    if (!plantilla)
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });

    return new NextResponse("\uFEFF" + plantilla.content, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${plantilla.filename}"`,
        },
    });
}
