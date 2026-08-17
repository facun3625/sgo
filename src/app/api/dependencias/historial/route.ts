import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { obtenerCobrosDependencia, rangoMes } from "@/lib/dependencias";

// Historial de cobros propio de la cuenta de dependencia logueada, filtrable por mes.
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || !session.dependenciaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const dependenciaId = session.dependenciaId;

    const { searchParams } = new URL(req.url);
    const rango = rangoMes(searchParams.get("mes"));

    const { cobros, totalCobrado } = await obtenerCobrosDependencia(dependenciaId, rango);
    return NextResponse.json({ cobros, totalCobrado });
}
