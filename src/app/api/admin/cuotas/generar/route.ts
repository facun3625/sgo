export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

export async function POST() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const periodo = new Date().toISOString().slice(0, 7);

    const configMonto = await prisma.config.findUnique({ where: { clave: "montoMensual" } });
    const monto = configMonto ? parseFloat(configMonto.valor) : 4500;

    const datos = await prisma.dato.findMany({ select: { expediente: true } });
    const todosExpedientes = datos.map((d) => d.expediente as string).filter(Boolean);

    const pagosAnuales = await prisma.pagoAnual.findMany({ select: { expediente: true } });
    const pagoAnualExp = new Set(pagosAnuales.map((p) => p.expediente));

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
        debitosActivos.filter((d) => !canceladosExp.has(d.expediente)).map((d) => d.expediente)
    );

    const expedientesACobrar = todosExpedientes.filter(
        (exp) => !pagoAnualExp.has(exp) && !debitoActivoExp.has(exp)
    );

    const result = await prisma.cuotaMensual.createMany({
        data: expedientesACobrar.map((expediente) => ({ expediente, periodo, monto, estado: "pendiente" })),
        skipDuplicates: true,
    });

    return NextResponse.json({ message: `Cuotas generadas para ${periodo}`, periodo, creadas: result.count });
}
