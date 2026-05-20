import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

const PLANTILLAS: Record<string, { filename: string; rows: string[][] }> = {
    matriculados: {
        filename: "plantilla_matriculados.xlsx",
        rows: [
            ["expediente","cod","apellido","nombre","documento","tomo","folio","domicilioLegal","postalLegal","localidadLegal","telefonosLegal","emailLegal","domicilioReal","postalReal","localidadReal","provinciaReal","telefonosReal","emailReal","codMovilLegal","movilLegal","codMovilReal","movilReal","fechaMatriculacion"],
            ["564","564","GARCIA","JUAN","12345678","1","100","AV SAN MARTIN 123","3000","SANTA FE","0342-123456","juan@email.com","","","","","","","","","","",""],
        ],
    },
    deudas: {
        filename: "plantilla_deudas.xlsx",
        rows: [["expediente","monto"],["564","15000"],["792","8500"]],
    },
    pagoAnual: {
        filename: "plantilla_pago_anual.xlsx",
        rows: [["expediente"],["564"],["792"]],
    },
    consultor: {
        filename: "plantilla_consultores.xlsx",
        rows: [["expediente"],["564"],["792"]],
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

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(plantilla.rows);
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${plantilla.filename}"`,
        },
    });
}
