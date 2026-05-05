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

    // Unión de expedientes: Dato + User (no admin) — igual que el resumen de pagos
    const [datosTodos, usersTodos] = await Promise.all([
        prisma.dato.findMany({ select: { expediente: true } }),
        prisma.user.findMany({
            where: { expediente: { not: null }, accessLevel: { notIn: ["admin", "superadmin"] } },
            select: { expediente: true },
        }),
    ]);
    const expSet = new Set<string>();
    for (const d of datosTodos) if (d.expediente) expSet.add(d.expediente);
    for (const u of usersTodos) if (u.expediente) expSet.add(u.expediente!);
    const todosExpedientes = Array.from(expSet);

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

    // Crear las que no existen
    const result = await prisma.cuotaMensual.createMany({
        data: expedientesACobrar.map((expediente) => ({ expediente, periodo, monto, estado: "pendiente" })),
        skipDuplicates: true,
    });

    // Actualizar monto de las que ya existían y siguen pendientes
    await prisma.cuotaMensual.updateMany({
        where: { periodo, estado: "pendiente", expediente: { in: expedientesACobrar } },
        data: { monto },
    });

    return NextResponse.json({ message: `Cuotas generadas para ${periodo}`, periodo, creadas: result.count });
}
