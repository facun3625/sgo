export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const configs = await prisma.config.findMany({
        where: { clave: { in: ["cbu", "alias"] } },
    });
    const map = Object.fromEntries(configs.map((c) => [c.clave, c.valor]));

    return NextResponse.json({ cbu: map.cbu ?? "", alias: map.alias ?? "" });
}
