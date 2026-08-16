export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getPaywayFrontendConfig, PaywaySeccion } from "@/lib/payway";

const SECCIONES_VALIDAS: PaywaySeccion[] = ["matricula_mensual", "matricula_anual", "deuda", "curso", "ventas"];

// Endpoint público (sin sesión) — expone solo la public key, nunca la secret key.
// La usa el checkout (matriculados e invitados) para inicializar decidir.js.
// ?seccion=curso|matricula_mensual|matricula_anual|deuda|ventas — cada sección se
// habilita/deshabilita por separado desde el admin.
export async function GET(req: NextRequest) {
    const seccion = req.nextUrl.searchParams.get("seccion") as PaywaySeccion | null;
    if (!seccion || !SECCIONES_VALIDAS.includes(seccion)) {
        return NextResponse.json({ error: "Sección inválida" }, { status: 400 });
    }
    const cfg = await getPaywayFrontendConfig(seccion);
    if (!cfg) return NextResponse.json({ disponible: false });
    return NextResponse.json({ disponible: true, publicKey: cfg.publicKey, apiUrl: cfg.apiUrl });
}
