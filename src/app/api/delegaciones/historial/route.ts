import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { obtenerCobrosDelegacion, rangoMes } from "@/lib/delegaciones";

// Historial de cobros propio de la cuenta de delegación logueada, filtrable por mes.
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || !session.delegacionId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const delegacionId = session.delegacionId;

    const { searchParams } = new URL(req.url);
    const rango = rangoMes(searchParams.get("mes"));

    const { cobros, totalCobrado } = await obtenerCobrosDelegacion(delegacionId, rango);
    return NextResponse.json({ cobros, totalCobrado });
}
