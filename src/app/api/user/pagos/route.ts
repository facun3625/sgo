import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { esMatriculadoJoven, esMatriculadoVeterano, esMatriculadoExento, calcularMesesSuspendidos, montoConDescuento } from "@/lib/matricula";

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
            pagoAnual,
            dbUser,
            datoMatricula,
            deudasPagadas,
            boletasRaw,
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
            prisma.user.findUnique({ where: { expediente }, select: { status: true } }),
            prisma.dato.findFirst({ where: { expediente }, select: { fechaMatriculacion: true, tipo: true } }),
            prisma.deudaPagada.findMany({
                where: { expediente },
                orderBy: { fechaPago: "desc" },
                take: 10,
                select: { id: true, monto: true, metodoPago: true, fechaPago: true },
            }),
            (prisma as any).facturaSantaFe.findMany({
                where: { expediente },
                orderBy: { createdAt: "desc" },
                select: { tipo: true, periodo: true, archivo: true, factura: true },
                take: 9,
            }).catch(() => []),
        ]);

        const [configTransferenciaArr, cfgVeterano, cfgExento, historialSusp] = await Promise.all([
            prisma.config.findMany({
                where: { clave: { in: ["transferencia_matricula_mensual", "transferencia_matricula_anual", "transferencia_deuda"] } },
            }),
            prisma.config.findUnique({ where: { clave: "beneficioVeterano" } }),
            prisma.config.findUnique({ where: { clave: "beneficioExento" } }),
            (prisma as any).historialMatricula.findMany({
                where: { expediente },
                orderBy: { createdAt: "asc" },
                select: { accion: true, createdAt: true },
            }),
        ]);
        const configTransferencia = configTransferenciaArr;
        const beneficioVeterano = cfgVeterano?.valor === "1";
        const beneficioExento = cfgExento?.valor === "1";
        const mesesSuspendidos = calcularMesesSuspendidos(historialSusp ?? []);
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

        const esConsultor = datoMatricula?.tipo === "consultor";
        const fecha = datoMatricula?.fechaMatriculacion;
        const montoAnualBase = configMontoAnual ? parseFloat(configMontoAnual.valor) : 48000;
        const joven = esConsultor ? false : esMatriculadoJoven(fecha);
        const veterano = (!esConsultor && !joven && beneficioVeterano) ? esMatriculadoVeterano(fecha, mesesSuspendidos) : false;
        const exento = (!esConsultor && !joven && beneficioExento) ? esMatriculadoExento(fecha, mesesSuspendidos) : false;
        const montoAnual = montoConDescuento(montoAnualBase, joven || veterano);

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

        // Pick latest boleta per tipo
        const getBoleta = (tipo: string) =>
            (boletasRaw as { tipo: string; periodo: string; archivo: string; factura: string | null }[])
                .find(b => b.tipo === tipo) ?? null;

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
            deudasPagadas,
            esConsultor,
            esJoven: joven,
            esVeterano: veterano,
            esExento: exento,
            totalDeuda: deudas.reduce((acc, curr) => acc + curr.monto, 0),
            transferenciaHabilitada: {
                matricula_mensual: !!tMap.transferencia_matricula_mensual,
                matricula_anual:   !!tMap.transferencia_matricula_anual,
                deuda:             !!tMap.transferencia_deuda,
            },
            userStatus: dbUser?.status ?? "active",
            boletas: {
                mensual: getBoleta("mensual"),
                anual: getBoleta("anual"),
                deuda: getBoleta("deuda"),
            },
        });

    } catch (error) {
        console.error("Error fetching pagos:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
