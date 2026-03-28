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
