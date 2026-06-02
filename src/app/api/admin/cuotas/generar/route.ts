export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { esMatriculadoJoven, esMatriculadoVeterano, esMatriculadoExento, calcularMesesSuspendidos, montoConDescuento } from "@/lib/matricula";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const periodo = new Date().toISOString().slice(0, 7);
    const [total, pagadas] = await Promise.all([
        prisma.cuotaMensual.count({ where: { periodo } }),
        prisma.cuotaMensual.count({ where: { periodo, estado: "pagado" } }),
    ]);
    return NextResponse.json({ periodo, total, pagadas });
}

export async function POST() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const periodo = new Date().toISOString().slice(0, 7);

    const [configMonto, cfgVeterano, cfgExento] = await Promise.all([
        prisma.config.findUnique({ where: { clave: "montoMensual" } }),
        prisma.config.findUnique({ where: { clave: "beneficioVeterano" } }),
        prisma.config.findUnique({ where: { clave: "beneficioExento" } }),
    ]);
    const montoBase = configMonto ? parseFloat(configMonto.valor) : 4500;
    const beneficioVeterano = cfgVeterano?.valor === "1";
    const beneficioExento = cfgExento?.valor === "1";

    const [datosTodos, usersTodos] = await Promise.all([
        prisma.dato.findMany({ select: { expediente: true, fechaMatriculacion: true, tipo: true } }),
        prisma.user.findMany({
            where: { expediente: { not: null }, accessLevel: { notIn: ["admin", "superadmin"] } },
            select: { expediente: true },
        }),
    ]);

    // Expedientes de consultores (no pagan matrícula)
    const consultoresExp = new Set(
        datosTodos.filter(d => d.tipo === "consultor" && d.expediente).map(d => d.expediente!)
    );

    // Mapa expediente → fechaMatriculacion
    const fechaMap = new Map<string, Date | null>();
    for (const d of datosTodos) if (d.expediente) fechaMap.set(d.expediente, d.fechaMatriculacion);

    // Historial de suspensiones para calcular meses descontados
    const historialTodos = await (prisma as any).historialMatricula.findMany({
        select: { expediente: true, accion: true, createdAt: true },
        orderBy: { createdAt: "asc" },
    });
    const historialMap = new Map<string, { accion: string; createdAt: Date }[]>();
    for (const h of historialTodos) {
        if (!historialMap.has(h.expediente)) historialMap.set(h.expediente, []);
        historialMap.get(h.expediente)!.push(h);
    }

    const expSet = new Set<string>();
    for (const d of datosTodos) if (d.expediente && !consultoresExp.has(d.expediente)) expSet.add(d.expediente);
    for (const u of usersTodos) if (u.expediente && !consultoresExp.has(u.expediente)) expSet.add(u.expediente!);

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

    // Filtrar exentos (50+ años) si el beneficio está activo
    const exentos = new Set(
        beneficioExento ? expedientesACobrar.filter(exp => {
            const ms = calcularMesesSuspendidos(historialMap.get(exp) ?? []);
            return esMatriculadoExento(fechaMap.get(exp), ms);
        }) : []
    );
    const expedientesSinExentos = expedientesACobrar.filter(exp => !exentos.has(exp));

    // Separar jovenes, veteranos (40-49 años) y normales
    const jovenes = expedientesSinExentos.filter(exp => esMatriculadoJoven(fechaMap.get(exp)));
    const veteranos = beneficioVeterano
        ? expedientesSinExentos.filter(exp => {
            if (esMatriculadoJoven(fechaMap.get(exp))) return false;
            const ms = calcularMesesSuspendidos(historialMap.get(exp) ?? []);
            return esMatriculadoVeterano(fechaMap.get(exp), ms);
        })
        : [];
    const normales = expedientesSinExentos.filter(exp =>
        !esMatriculadoJoven(fechaMap.get(exp)) && !veteranos.includes(exp)
    );

    const montoJoven = montoConDescuento(montoBase, true);
    const montoVeterano = montoConDescuento(montoBase, true);

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

    const [creaNormales, creaJovenes, creaVeteranos] = await Promise.all([
        prisma.cuotaMensual.createMany({
            data: normales.map(expediente => ({ expediente, periodo, monto: montoBase, estado: "pendiente" })),
            skipDuplicates: true,
        }),
        prisma.cuotaMensual.createMany({
            data: jovenes.map(expediente => ({ expediente, periodo, monto: montoJoven, estado: "pendiente" })),
            skipDuplicates: true,
        }),
        prisma.cuotaMensual.createMany({
            data: veteranos.map(expediente => ({ expediente, periodo, monto: montoVeterano, estado: "pendiente" })),
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
        prisma.cuotaMensual.updateMany({
            where: { periodo, estado: "pendiente", expediente: { in: veteranos } },
            data: { monto: montoVeterano },
        }),
    ]);

    return NextResponse.json({
        message: `Cuotas generadas para ${periodo}`,
        periodo,
        creadas: creaNormales.count + creaJovenes.count + creaVeteranos.count,
        jovenes: jovenes.length,
        veteranos: veteranos.length,
        exentos: exentos.size,
        normales: normales.length,
    });
}
