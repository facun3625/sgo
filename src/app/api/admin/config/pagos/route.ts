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
    const ambiente = map.paywayAmbiente === "production" ? "production" : "developer";

    // Migración: si todavía no se guardó nada bajo la clave nueva por-ambiente,
    // se toma el valor viejo (único, sin sufijo) como perteneciente al ambiente
    // que esté activo en este momento — coincide con lo que usa lib/payway.ts.
    const configuradoPara = (campo: "paywaySiteId" | "paywayPublicKey" | "paywaySecretKey", amb: "developer" | "production") => {
        const especifico = map[`${campo}_${amb}`];
        if (especifico !== undefined) return !!especifico;
        return amb === ambiente && !!map[campo];
    };

    return NextResponse.json({
        mpTokenConfigurado: !!map.mpAccessToken,
        mpPublicKeyConfigurado: !!map.mpPublicKey,
        paywayAmbiente: ambiente,
        paywaySiteIdConfiguradoSandbox: configuradoPara("paywaySiteId", "developer"),
        paywayPublicKeyConfiguradoSandbox: configuradoPara("paywayPublicKey", "developer"),
        paywaySecretKeyConfiguradoSandbox: configuradoPara("paywaySecretKey", "developer"),
        paywaySiteIdConfiguradoProduccion: configuradoPara("paywaySiteId", "production"),
        paywayPublicKeyConfiguradoProduccion: configuradoPara("paywayPublicKey", "production"),
        paywaySecretKeyConfiguradoProduccion: configuradoPara("paywaySecretKey", "production"),
        cbu: map.cbu ?? "",
        alias: map.alias ?? "",
        transferencia_matricula_mensual: map.transferencia_matricula_mensual === "1",
        transferencia_matricula_anual:   map.transferencia_matricula_anual === "1",
        transferencia_deuda:             map.transferencia_deuda === "1",
        transferencia_curso:             map.transferencia_curso === "1",
        transferencia_ventas:            map.transferencia_ventas === "1",
        payway_matricula_mensual: map.payway_matricula_mensual === "1",
        payway_matricula_anual:   map.payway_matricula_anual === "1",
        payway_deuda:             map.payway_deuda === "1",
        payway_curso:             map.payway_curso === "1",
        payway_ventas:            map.payway_ventas === "1",
    });
}
