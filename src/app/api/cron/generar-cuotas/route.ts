export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    if (searchParams.get("secret") !== secret) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const periodo = new Date().toISOString().slice(0, 7); // "2026-03"

    // Leer monto mensual de Config, default 4500
    const configMonto = await prisma.config.findUnique({ where: { clave: "montoMensual" } });
    const monto = configMonto ? parseFloat(configMonto.valor) : 4500;

    // Obtener todos los expedientes del padrón
    const datos = await prisma.dato.findMany({
        where: { expediente: { not: null } },
        select: { expediente: true },
    });
    const todosExpedientes = datos.map((d) => d.expediente as string).filter(Boolean);

    // Obtener expedientes con pago anual activo
    const pagosAnuales = await prisma.pagoAnual.findMany({ select: { expediente: true } });
    const pagoAnualExp = new Set(pagosAnuales.map((p) => p.expediente));

    // Obtener expedientes con débito automático activo (aprobado sin cancelación aprobada)
    const debitosActivos = await prisma.adhesionDebito.findMany({
        where: { estado: "aprobada", tipoAdhesion: { not: "CANCELACION" } },
        select: { expediente: true },
    });
    const cancelaciones = await prisma.adhesionDebito.findMany({
        where: { estado: "aprobada", tipoAdhesion: "CANCELACION" },
        select: { expediente: true },
    });
    const canceladosExp = new Set(cancelaciones.map((c) => c.expediente));
    const debitoActivoExp = new Set(
        debitosActivos
            .filter((d) => !canceladosExp.has(d.expediente))
            .map((d) => d.expediente)
    );

    // Crear cuotas solo para quienes no tienen pago anual ni débito activo
    const expedientesACobrar = todosExpedientes.filter(
        (exp) => !pagoAnualExp.has(exp) && !debitoActivoExp.has(exp)
    );

    const result = await prisma.cuotaMensual.createMany({
        data: expedientesACobrar.map((expediente) => ({
            expediente,
            periodo,
            monto,
            estado: "pendiente",
        })),
        skipDuplicates: true,
    });

    return NextResponse.json({
        message: `Cuotas generadas para el período ${periodo}.`,
        periodo,
        creadas: result.count,
    });
}
