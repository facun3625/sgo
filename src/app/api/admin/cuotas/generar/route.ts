export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { esMatriculadoJoven, montoConDescuento } from "@/lib/matricula";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

export async function POST() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const periodo = new Date().toISOString().slice(0, 7);

    const configMonto = await prisma.config.findUnique({ where: { clave: "montoMensual" } });
    const montoBase = configMonto ? parseFloat(configMonto.valor) : 4500;

    const [datosTodos, usersTodos] = await Promise.all([
        prisma.dato.findMany({ select: { expediente: true, fechaMatriculacion: true } }),
        prisma.user.findMany({
            where: { expediente: { not: null }, accessLevel: { notIn: ["admin", "superadmin"] } },
            select: { expediente: true },
        }),
    ]);

    // Mapa expediente → fechaMatriculacion
    const fechaMap = new Map<string, Date | null>();
    for (const d of datosTodos) if (d.expediente) fechaMap.set(d.expediente, d.fechaMatriculacion);

    const expSet = new Set<string>();
    for (const d of datosTodos) if (d.expediente) expSet.add(d.expediente);
    for (const u of usersTodos) if (u.expediente) expSet.add(u.expediente!);

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

    const expedientesACobrar = Array.from(expSet).filter(
        (exp) => !pagoAnualExp.has(exp) && !debitoActivoExp.has(exp)
    );

    // Separar jovenes y normales
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

    // Actualizar pendientes existentes con el monto correcto
    await Promise.all([
        prisma.cuotaMensual.updateMany({
            where: { periodo, estado: "pendiente", expediente: { in: normales } },
            data: { monto: montoBase },
        }),
        prisma.cuotaMensual.updateMany({
            where: { periodo, estado: "pendiente", expediente: { in: jovenes } },
            data: { monto: montoJoven },
        }),
    ]);

    return NextResponse.json({
        message: `Cuotas generadas para ${periodo}`,
        periodo,
        creadas: creaNormales.count + creaJovenes.count,
        jovenes: jovenes.length,
        normales: normales.length,
    });
}
