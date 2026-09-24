import prisma from "@/lib/prisma";

export async function crearNotificacion(
    expediente: string,
    titulo: string,
    mensaje: string,
    tipo: string = "general"
) {
    return prisma.notificacion.create({
        data: { expediente, titulo, mensaje, tipo },
    });
}

// Notifica a todos los admins/superadmins (no a un matriculado puntual) — mismo
// patrón que ya usa "Modificación de Datos" (tipo admin_cambios) en api/user/datos.
export async function notificarAdmins(titulo: string, mensaje: string, tipo: string) {
    const admins = await prisma.user.findMany({
        where: { accessLevel: { in: ["admin", "superadmin"] } },
        select: { expediente: true },
    });
    if (admins.length === 0) return;
    await prisma.notificacion.createMany({
        data: admins.filter(a => a.expediente).map(a => ({
            expediente: a.expediente!,
            titulo,
            mensaje,
            tipo,
        })),
    });
}
