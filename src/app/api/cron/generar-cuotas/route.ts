export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { esMatriculadoJoven, esRecienMatriculado, montoConDescuento } from "@/lib/matricula";

export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    if (searchParams.get("secret") !== secret) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const periodo = new Date().toISOString().slice(0, 7);

    const configMonto = await prisma.config.findUnique({ where: { clave: "montoMensual" } });
    const montoBase = configMonto ? parseFloat(configMonto.valor) : 4500;

    const datos = await prisma.dato.findMany({
        where: { expediente: { not: null } },
        select: { expediente: true, fechaMatriculacion: true, tipo: true },
    });

    const fechaMap = new Map<string, Date | null>();
    for (const d of datos) if (d.expediente) fechaMap.set(d.expediente, d.fechaMatriculacion);

    // Excluir consultores
    const todosExpedientes = datos
        .filter(d => d.tipo !== "consultor")
        .map(d => d.expediente as string)
        .filter(Boolean);

    const pagosAnuales = await prisma.pagoAnual.findMany({ select: { expediente: true } });
    const pagoAnualExp = new Set(pagosAnuales.map(p => p.expediente));

    const debitosActivos = await prisma.adhesionDebito.findMany({
        where: { estado: "aprobada", tipoAdhesion: { not: "CANCELACION" } },
        select: { expediente: true },
    });
    const cancelaciones = await prisma.adhesionDebito.findMany({
        where: { estado: "aprobada", tipoAdhesion: "CANCELACION" },
        select: { expediente: true },
    });
    const canceladosExp = new Set(cancelaciones.map(c => c.expediente));
    const debitoActivoExp = new Set(
        debitosActivos.filter(d => !canceladosExp.has(d.expediente)).map(d => d.expediente)
    );

    const expedientesACobrar = todosExpedientes.filter(
        exp => !pagoAnualExp.has(exp) && !debitoActivoExp.has(exp)
    );

    const recientes = expedientesACobrar.filter(exp => esRecienMatriculado(fechaMap.get(exp), periodo));
    const recientesSet = new Set(recientes);
    const sinRecientes = expedientesACobrar.filter(exp => !recientesSet.has(exp));
    const jovenes = sinRecientes.filter(exp => esMatriculadoJoven(fechaMap.get(exp)));
    const normales = sinRecientes.filter(exp => !esMatriculadoJoven(fechaMap.get(exp)));
    const montoJoven = montoConDescuento(montoBase, true);

    // Limpiar cuotas pendientes de meses anteriores sin pago asociado
    const cuotasViejasPendientes = await prisma.cuotaMensual.findMany({
        where: { estado: "pendiente", periodo: { lt: periodo } },
        select: { id: true },
    });
    if (cuotasViejasPendientes.length > 0) {
        const ids = cuotasViejasPendientes.map(c => c.id);
        const conPago = await prisma.pagoPendiente.findMany({
            where: { tipo: "matricula_mensual", estado: "pendiente", ref: { in: ids.map(String) } },
            select: { ref: true },
        });
        const conPagoSet = new Set(conPago.map(p => parseInt(p.ref)));
        const idsEliminar = ids.filter(id => !conPagoSet.has(id));
        if (idsEliminar.length > 0) {
            await prisma.cuotaMensual.deleteMany({ where: { id: { in: idsEliminar } } });
        }
    }

    const ahora = new Date();
    const [creaNormales, creaJovenes, creaRecientes] = await Promise.all([
        prisma.cuotaMensual.createMany({
            data: normales.map(expediente => ({ expediente, periodo, monto: montoBase, estado: "pendiente" })),
            skipDuplicates: true,
        }),
        prisma.cuotaMensual.createMany({
            data: jovenes.map(expediente => ({ expediente, periodo, monto: montoJoven, estado: "pendiente" })),
            skipDuplicates: true,
        }),
        prisma.cuotaMensual.createMany({
            data: recientes.map(expediente => ({ expediente, periodo, monto: montoJoven, estado: "pagado", fechaPago: ahora, metodoPago: "matriculacion" })),
            skipDuplicates: true,
        }),
    ]);

    // Corregir montos de cuotas pendientes ya existentes
    await Promise.all([
        prisma.cuotaMensual.updateMany({
            where: { periodo, estado: "pendiente", expediente: { in: normales } },
            data: { monto: montoBase },
        }),
        prisma.cuotaMensual.updateMany({
            where: { periodo, estado: "pendiente", expediente: { in: jovenes } },
            data: { monto: montoJoven },
        }),
        // Si ya existía como pendiente, convertir a pagado
        prisma.cuotaMensual.updateMany({
            where: { periodo, estado: "pendiente", expediente: { in: recientes } },
            data: { monto: montoJoven, estado: "pagado", fechaPago: ahora, metodoPago: "matriculacion" },
        }),
    ]);

    return NextResponse.json({
        message: `Cuotas generadas para ${periodo}.`,
        periodo,
        creadas: creaNormales.count + creaJovenes.count + creaRecientes.count,
        jovenes: jovenes.length,
        recientes: recientes.length,
    });
}
