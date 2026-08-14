export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getPaywayFrontendConfig } from "@/lib/payway";

// Endpoint público (sin sesión) — expone solo la public key, nunca la secret key.
// La usa el checkout (matriculados e invitados) para inicializar decidir.js.
export async function GET() {
    const cfg = await getPaywayFrontendConfig();
    if (!cfg) return NextResponse.json({ disponible: false });
    return NextResponse.json({ disponible: true, publicKey: cfg.publicKey, apiUrl: cfg.apiUrl });
}
