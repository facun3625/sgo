import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getSession();

        if (!session || !session.expediente) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const expediente = session.expediente;
        const currentPeriod = new Date().toISOString().slice(0, 7); // "2026-03"

        // Fetch de todos los conceptos financieros en paralelo
        const [
            deudas,
            cuotaActual,
            configMontoAnual,
            debitoAprobado,
            cancelacionAprobada,
            debitoEnTramite,
            cancelacionPendiente,
            pagoAnual
        ] = await Promise.all([
            prisma.deuda.findMany({ where: { expediente } }),
            prisma.cuotaMensual.findFirst({ where: { expediente, periodo: currentPeriod } }),
            prisma.config.findUnique({ where: { clave: "montoAnual" } }),
            prisma.adhesionDebito.findFirst({
                where: { expediente, estado: "aprobada", tipoAdhesion: { not: "CANCELACION" } }
            }),
            prisma.adhesionDebito.findFirst({
                where: { expediente, estado: "aprobada", tipoAdhesion: "CANCELACION" }
            }),
            prisma.adhesionDebito.findFirst({
                where: { expediente, estado: "pendiente", tipoAdhesion: { not: "CANCELACION" } }
            }),
            prisma.adhesionDebito.findFirst({
                where: { expediente, estado: "pendiente", tipoAdhesion: "CANCELACION" }
            }),
            prisma.pagoAnual.findFirst({ where: { expediente } }),
        ]);

        const historialCuotas = await prisma.cuotaMensual.findMany({
            where: { expediente },
            orderBy: { periodo: "desc" },
            take: 12,
        });

        // Débito activo solo si hay adhesión aprobada y no hay cancelación aprobada
        const debitoActivo = !!debitoAprobado && !cancelacionAprobada;
        const debitoPendiente = !!debitoEnTramite;
        const cancelacionEnTramite = !!cancelacionPendiente;

        const montoAnual = configMontoAnual ? parseFloat(configMontoAnual.valor) : 48000;

        return NextResponse.json({
            deudas,
            cuotaActual,
            historialCuotas,
            montoAnual,
            hasDebitoAutomatico: debitoActivo,
            hasDebitoEnTramite: debitoPendiente,
            hasCancelacionPendiente: cancelacionEnTramite,
            hasPagoAnualActivo: !!pagoAnual,
            totalDeuda: deudas.reduce((acc, curr) => acc + curr.monto, 0)
        });

    } catch (error) {
        console.error("Error fetching pagos:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
