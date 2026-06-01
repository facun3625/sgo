export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

const DEFAULT_TABS = ["matriculados", "nuevos-matriculados", "financiero", "banelco", "fiadores", "adhesiones", "usuarios", "suspensiones", "tribunal"];

export async function GET() {
    const session = await getSession();
    if (!session || session.accessLevel !== "superadmin")
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const config = await prisma.config.findUnique({ where: { clave: "importar_tabs_activas" } });
    if (!config) return NextResponse.json({ tabsActivas: DEFAULT_TABS });

    try {
        return NextResponse.json({ tabsActivas: JSON.parse(config.valor) });
    } catch {
        return NextResponse.json({ tabsActivas: DEFAULT_TABS });
    }
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.accessLevel !== "superadmin")
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { tabsActivas } = await req.json();
    if (!Array.isArray(tabsActivas))
        return NextResponse.json({ error: "Formato inválido" }, { status: 400 });

    await prisma.config.upsert({
        where: { clave: "importar_tabs_activas" },
        update: { valor: JSON.stringify(tabsActivas) },
        create: { clave: "importar_tabs_activas", valor: JSON.stringify(tabsActivas) },
    });

    return NextResponse.json({ ok: true });
}
