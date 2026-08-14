export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const configs = await prisma.config.findMany();
    const map = Object.fromEntries(configs.map((c) => [c.clave, c.valor]));

    return NextResponse.json({
        mpTokenConfigurado: !!map.mpAccessToken,
        mpPublicKeyConfigurado: !!map.mpPublicKey,
        paywaySiteIdConfigurado: !!map.paywaySiteId,
        paywayPublicKeyConfigurado: !!map.paywayPublicKey,
        paywaySecretKeyConfigurado: !!map.paywaySecretKey,
        paywayAmbiente: map.paywayAmbiente === "production" ? "production" : "developer",
        cbu: map.cbu ?? "",
        alias: map.alias ?? "",
        transferencia_matricula_mensual: map.transferencia_matricula_mensual === "1",
        transferencia_matricula_anual:   map.transferencia_matricula_anual === "1",
        transferencia_deuda:             map.transferencia_deuda === "1",
        transferencia_curso:             map.transferencia_curso === "1",
        transferencia_ventas:            map.transferencia_ventas === "1",
    });
}
