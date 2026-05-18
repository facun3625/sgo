export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const configs = await prisma.config.findMany({
        where: { clave: { in: ["smtpHost", "smtpPort", "smtpUser", "smtpFrom"] } },
    });
    const map = Object.fromEntries(configs.map(c => [c.clave, c.valor]));

    return NextResponse.json({
        smtpHost: map.smtpHost ?? "",
        smtpPort: map.smtpPort ?? "465",
        smtpUser: map.smtpUser ?? "",
        smtpFrom: map.smtpFrom ?? "",
        // smtpPass no se devuelve por seguridad
    });
}
