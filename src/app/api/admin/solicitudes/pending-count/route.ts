export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Maps solicitudes sub-permission → tipo keyword in DB
const SUBTAB_TIPO: Record<string, string> = {
    "solicitudes:Certificado": "Certificado",
    "solicitudes:SISFE": "SISFE",
    "solicitudes:CATASTRO": "CATASTRO",
    "solicitudes:Jurisprudencia": "Jurisprudencia",
};

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const permisos: string[] = session.permisos ?? [];
    const isSuperAdmin = session.accessLevel === "superadmin";
    const hasFullSolicitudes = isSuperAdmin || permisos.includes("solicitudes");

    // Admins with only sub-permissions (solicitudes:X) see only their types
    const subtabs = permisos.filter(p => p.startsWith("solicitudes:"));
    const isRestricted = !hasFullSolicitudes && subtabs.length > 0;

    if (isRestricted) {
        const tiposPermitidos = subtabs.map(k => SUBTAB_TIPO[k]).filter(Boolean);
        if (tiposPermitidos.length === 0) {
            return NextResponse.json({ count: 0 });
        }
        const count = await prisma.solicitud.count({
            where: {
                estado: "pendiente",
                OR: tiposPermitidos.map(t => ({ tipo: { contains: t } })),
            },
        });
        return NextResponse.json({ count });
    }

    const count = await prisma.solicitud.count({
        where: { estado: "pendiente" },
    });

    return NextResponse.json({ count });
}
