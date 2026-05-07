export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const configs = await prisma.config.findMany();
    const map = Object.fromEntries(configs.map((c) => [c.clave, c.valor]));

    return NextResponse.json({
        montoMensual: map.montoMensual ?? "4500",
        montoAnual: map.montoAnual ?? "48000",
        pagoAnualDesde: map.pagoAnualDesde ?? "",
        pagoAnualHasta: map.pagoAnualHasta ?? "",
        jus: map.jus ?? "",
        // No devolvemos los valores reales — solo si están configurados
        mpTokenConfigurado: !!map.mpAccessToken,
        mpPublicKeyConfigurado: !!map.mpPublicKey,
    });
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { clave, valor } = body;

    if (!clave || valor === undefined || valor === null) {
        return NextResponse.json({ error: "clave y valor son requeridos" }, { status: 400 });
    }

    const config = await prisma.config.upsert({
        where: { clave },
        update: { valor: String(valor) },
        create: { clave, valor: String(valor) },
    });

    return NextResponse.json(config);
}
