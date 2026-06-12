import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const [activaConf, jus, jusDate] = await Promise.all([
        prisma.config.findUnique({ where: { clave: "calculadoraHonorariosActiva" } }),
        prisma.config.findUnique({ where: { clave: "valorJus" } }),
        prisma.config.findUnique({ where: { clave: "valorJusActualizadoEn" } }),
    ]);

    return NextResponse.json({
        activa: activaConf ? activaConf.valor !== "0" : true,
        valorJus: jus ? parseFloat(jus.valor) : null,
        actualizadoEn: jusDate?.valor ?? null,
    });
}
