import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

// DELETE — solo superadmin: borra dato + user + solicitudes del expediente
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ expediente: string }> }
) {
    const session = await getSession();
    if (!session || session.accessLevel !== "superadmin")
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { expediente } = await params;
    if (!expediente) return NextResponse.json({ error: "Expediente requerido" }, { status: 400 });

    // Buscar el dato exclusivamente por expediente — si no matchea, no se busca por cod
    const dato = await prisma.dato.findFirst({ where: { expediente } });
    if (!dato) return NextResponse.json({ error: "Matriculado no encontrado" }, { status: 404 });

    const exp = dato.expediente!;
    const cod = dato.cod;

    await prisma.$transaction([
        // Trámites / gestiones
        prisma.solicitud.deleteMany({ where: { expediente: exp } }),
        // Cambios de datos pendientes
        prisma.cambioDatos.deleteMany({ where: { expediente: exp } }),
        // Historial de matrícula
        prisma.historialMatricula.deleteMany({ where: { expediente: exp } }),
        // Fiadores (como matriculado o como fiador)
        prisma.fiador.deleteMany({ where: { OR: [{ expediente: exp }, { fiadorExpediente: exp }] } }),
        // Deudas
        prisma.deuda.deleteMany({ where: { expediente: exp } }),
        // Cuotas
        prisma.cuotaMensual.deleteMany({ where: { expediente: exp } }),
        // Pagos pendientes
        prisma.pagoPendiente.deleteMany({ where: { expediente: exp } }),
        // Notificaciones
        prisma.notificacion.deleteMany({ where: { expediente: exp } }),
        // User (cuenta de acceso)
        prisma.user.deleteMany({ where: { OR: [{ expediente: exp }, { cod }] } }),
        // Dato (padrón)
        prisma.dato.deleteMany({ where: { OR: [{ expediente: exp }, { cod }] } }),
    ]);

    return NextResponse.json({ ok: true });
}
