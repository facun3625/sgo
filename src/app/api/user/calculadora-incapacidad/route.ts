import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const config = await prisma.config.findUnique({ where: { clave: "calculadoraIncapacidadActiva" } });
    return NextResponse.json({ activa: config ? config.valor !== "0" : true });
}
