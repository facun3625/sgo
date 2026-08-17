import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { esMatriculadoJoven, montoConDescuento } from "@/lib/matricula";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

// Vista de solo lectura (datos + deuda + estado de cuotas) para la pantalla de
// cobro en efectivo de Dependencias. No expone ningún endpoint de edición.
export async function GET(_: NextRequest, { params }: { params: Promise<{ expediente: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { expediente } = await params;

    const currentPeriod = new Date().toISOString().slice(0, 7);

    const [dato, deuda, deudaComprobantes, cuotaActual, pagoAnual, configMontoAnual, configPagoAnualDesde, configPagoAnualHasta] = await Promise.all([
        prisma.dato.findFirst({ where: { expediente } }),
        prisma.deuda.findFirst({ where: { expediente } }),
        prisma.deudaComprobante.findMany({ where: { expediente }, orderBy: { fechaVencimiento: "asc" }, select: { fechaVencimiento: true, monto: true } }),
        prisma.cuotaMensual.findFirst({ where: { expediente, periodo: currentPeriod } }),
        prisma.pagoAnual.findFirst({ where: { expediente } }),
        prisma.config.findUnique({ where: { clave: "montoAnual" } }),
        prisma.config.findUnique({ where: { clave: "pagoAnualDesde" } }),
        prisma.config.findUnique({ where: { clave: "pagoAnualHasta" } }),
    ]);

    if (!dato) return NextResponse.json({ error: "Matriculado no encontrado" }, { status: 404 });

    let showPagoAnual = false;
    const desde = configPagoAnualDesde?.valor;
    const hasta = configPagoAnualHasta?.valor;
    if (desde && hasta) {
        const now = new Date();
        const d = new Date(desde);
        const h = new Date(hasta);
        const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        showPagoAnual = hoy >= new Date(d.getFullYear(), d.getMonth(), d.getDate()) && hoy <= new Date(h.getFullYear(), h.getMonth(), h.getDate());
    } else {
        showPagoAnual = new Date().getMonth() <= 2;
    }

    const montoAnualBase = configMontoAnual ? parseFloat(configMontoAnual.valor) : 48000;
    const montoAnual = montoConDescuento(montoAnualBase, esMatriculadoJoven(dato.fechaMatriculacion));

    return NextResponse.json({
        dato,
        deuda: { total: deuda?.monto ?? 0, comprobantes: deudaComprobantes },
        cuotaActual: cuotaActual ? { id: cuotaActual.id, periodo: cuotaActual.periodo, monto: cuotaActual.monto, estado: cuotaActual.estado } : null,
        showPagoAnual,
        montoAnual,
        hasPagoAnualActivo: !!pagoAnual,
    });
}
