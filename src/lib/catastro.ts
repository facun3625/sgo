import prisma from "@/lib/prisma";

export async function revocarAccesoCatastro(
    expediente: string,
    motivo: "suspension" | "cancelacion"
) {
    const [solicitudActiva, dato] = await Promise.all([
        prisma.solicitud.findFirst({
            where: {
                expediente,
                estado: "completada",
                AND: [
                    { OR: [{ tipo: { contains: "CATASTRO" } }, { tipo: { contains: "SIGIT" } }] },
                    { NOT: { tipo: { contains: "Baja" } } },
                ],
            },
        }),
        prisma.dato.findFirst({ where: { expediente }, select: { cuil: true } }),
    ]);

    if (!solicitudActiva) return;

    const motivoTexto =
        motivo === "cancelacion" ? "cancelación de matrícula" : "suspensión de matrícula";
    const detallesActuales = (solicitudActiva.detalles as Record<string, any>) ?? {};

    await Promise.all([
        prisma.solicitud.update({
            where: { id: solicitudActiva.id },
            data: {
                estado: "rechazada",
                detalles: { ...detallesActuales, autoRevocada: true, motivoRevocacion: motivo },
            },
        }),
        prisma.notificacion.create({
            data: {
                expediente,
                titulo: "Acceso CATASTRO/SIGIT dado de baja",
                mensaje: `Tu acceso a CATASTRO/SIGIT fue dado de baja automáticamente por ${motivoTexto}. Podrás volver a solicitarlo cuando tu matrícula sea rehabilitada.`,
                tipo: "tramite",
            },
        }),
        prisma.solicitud.create({
            data: {
                expediente,
                tipo: "Baja CATASTRO/SIGIT",
                estado: "pendiente",
                detalles: {
                    sistema: true,
                    motivoBaja: motivo,
                    cuit: dato?.cuil ?? null,
                },
            },
        }),
    ]);
}
