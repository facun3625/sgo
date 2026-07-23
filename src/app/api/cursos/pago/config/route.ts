export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Datos bancarios públicos para mostrar en el modal de transferencia de invitados.
export async function GET() {
    const configs = await prisma.config.findMany({
        where: { clave: { in: ["cbu", "alias"] } },
    });
    const map = Object.fromEntries(configs.map((c) => [c.clave, c.valor]));

    return NextResponse.json({ cbu: map.cbu ?? "", alias: map.alias ?? "" });
}
