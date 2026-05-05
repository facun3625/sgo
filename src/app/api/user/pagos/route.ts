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
            configPagoAnualDesde,
            configPagoAnualHasta,
            debitoAprobado,
            cancelacionAprobada,
            debitoEnTramite,
            cancelacionPendiente,
            pagoAnual
        ] = await Promise.all([
            prisma.deuda.findMany({ where: { expediente } }),
            prisma.cuotaMensual.findFirst({ where: { expediente, periodo: currentPeriod } }),
            prisma.config.findUnique({ where: { clave: "montoAnual" } }),
            prisma.config.findUnique({ where: { clave: "pagoAnualDesde" } }),
            prisma.config.findUnique({ where: { clave: "pagoAnualHasta" } }),
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

        const configTransferencia = await prisma.config.findMany({
            where: { clave: { in: ["transferencia_matricula_mensual", "transferencia_matricula_anual", "transferencia_deuda"] } },
        });
        const tMap = Object.fromEntries(configTransferencia.map((c) => [c.clave, c.valor === "1"]));

        const historialCuotasRaw = await prisma.cuotaMensual.findMany({
            where: { expediente },
            orderBy: { periodo: "desc" },
            take: 12,
        });

        const pagosPendientesHistorial = await prisma.pagoPendiente.findMany({
            where: { expediente, ref: { in: historialCuotasRaw.map((c) => String(c.id)) } },
            select: { ref: true, estado: true },
        });
        const mapPPHistorial = new Map(pagosPendientesHistorial.map((pp) => [pp.ref, pp.estado]));

        type MetodoCuota = "mercadopago" | "transferencia" | "home_banking" | "banelco" | "transferencia_pendiente" | null;
        const historialCuotas = historialCuotasRaw.map((c) => {
            const ppEstado = mapPPHistorial.get(String(c.id));
            const mp = (c as { metodoPago?: string }).metodoPago;
            let metodo: MetodoCuota = null;
            if (c.estado === "pagado") {
                if (mp === "banelco") metodo = "banelco";
                else if (mp === "home_banking") metodo = "home_banking";
                else if (mp === "transferencia") metodo = "transferencia";
                else if (mp === "mercadopago") metodo = "mercadopago";
                else metodo = ppEstado === "aprobado" ? "transferencia" : "mercadopago";
            } else if (ppEstado === "pendiente") {
                metodo = "transferencia_pendiente";
            }
            return { ...c, metodo };
        });

        // Débito activo solo si hay adhesión aprobada y no hay cancelación aprobada
        const debitoActivo = !!debitoAprobado && !cancelacionAprobada;
        const debitoPendiente = !!debitoEnTramite;
        const cancelacionEnTramite = !!cancelacionPendiente;

        const montoAnual = configMontoAnual ? parseFloat(configMontoAnual.valor) : 48000;

        // Ventana de pago anual — si no está configurada, fallback a ene-mar
        let showPagoAnual = false;
        const desde = configPagoAnualDesde?.valor;
        const hasta = configPagoAnualHasta?.valor;
        if (desde && hasta) {
            const now = new Date();
            const d = new Date(desde);
            const h = new Date(hasta);
            // Comparar solo fecha (sin hora)
            const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const dFecha = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const hFecha = new Date(h.getFullYear(), h.getMonth(), h.getDate());
            showPagoAnual = hoy >= dFecha && hoy <= hFecha;
        } else {
            // Fallback: enero a marzo
            showPagoAnual = new Date().getMonth() <= 2;
        }

        return NextResponse.json({
            deudas,
            cuotaActual,
            historialCuotas,
            montoAnual,
            showPagoAnual,
            hasDebitoAutomatico: debitoActivo,
            hasDebitoEnTramite: debitoPendiente,
            hasCancelacionPendiente: cancelacionEnTramite,
            hasPagoAnualActivo: !!pagoAnual,
            totalDeuda: deudas.reduce((acc, curr) => acc + curr.monto, 0),
            transferenciaHabilitada: {
                matricula_mensual: !!tMap.transferencia_matricula_mensual,
                matricula_anual:   !!tMap.transferencia_matricula_anual,
                deuda:             !!tMap.transferencia_deuda,
            }
        });

    } catch (error) {
        console.error("Error fetching pagos:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
