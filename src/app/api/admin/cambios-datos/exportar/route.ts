import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generarExportacionModificaciones } from "@/lib/exportarModificacionesDatos";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

// Disparo manual del export diario (ver src/lib/exportarModificacionesDatos.ts)
// — para probarlo o para forzarlo fuera de la ventana de las 7:30 si hace falta.
export async function POST() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    try {
        const resultado = await generarExportacionModificaciones();
        return NextResponse.json(resultado);
    } catch (err) {
        const detalle = err instanceof Error ? err.message : "Error desconocido";
        console.error("[export-modificaciones] Error en el disparo manual:", err);
        return NextResponse.json({ error: detalle }, { status: 500 });
    }
}
