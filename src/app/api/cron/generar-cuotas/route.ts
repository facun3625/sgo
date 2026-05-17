export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { esMatriculadoJoven, montoConDescuento } from "@/lib/matricula";

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

    const jovenes = expedientesACobrar.filter(exp => esMatriculadoJoven(fechaMap.get(exp)));
    const normales = expedientesACobrar.filter(exp => !esMatriculadoJoven(fechaMap.get(exp)));
    const montoJoven = montoConDescuento(montoBase, true);

    const [creaNormales, creaJovenes] = await Promise.all([
        prisma.cuotaMensual.createMany({
            data: normales.map(expediente => ({ expediente, periodo, monto: montoBase, estado: "pendiente" })),
            skipDuplicates: true,
        }),
        prisma.cuotaMensual.createMany({
            data: jovenes.map(expediente => ({ expediente, periodo, monto: montoJoven, estado: "pendiente" })),
            skipDuplicates: true,
        }),
    ]);

    return NextResponse.json({
        message: `Cuotas generadas para ${periodo}.`,
        periodo,
        creadas: creaNormales.count + creaJovenes.count,
        jovenes: jovenes.length,
    });
}
