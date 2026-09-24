export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { tienePermiso } from "@/lib/admin-secciones";

// Historial de corridas del watcher de FTP (ver src/lib/ftpImportDeudas.ts) —
// se muestra en /admin/importar, pestaña Financiero, para no depender solo de
// la notificación cuando hay un error.
export async function GET() {
    const session = await getSession();
    if (!session || !["admin", "superadmin"].includes(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!tienePermiso(session.permisos, "importar:financiero", session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const registros = await prisma.importacionAutomatica.findMany({
        where: { tipo: "deudas" },
        orderBy: { createdAt: "desc" },
        take: 10,
    });

    return NextResponse.json({ registros });
}
