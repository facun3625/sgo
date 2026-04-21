export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) {
    return lvl === "superadmin" || lvl === "admin";
}

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const periodo = new Date().toISOString().slice(0, 7);

    // Base: todos los matriculados con expediente
    const datos = await prisma.dato.findMany({
        where: { NOT: { expediente: null } },
        select: { expediente: true, nombre: true, apellido: true },
    });
    const expedientes = datos.map((d) => d.expediente as string);

    // Excluir: débito automático aprobado
    const debitosAprobados = await prisma.adhesionDebito.findMany({
        where: { expediente: { in: expedientes }, estado: "aprobada" },
        select: { expediente: true },
    });
    const setDebito = new Set(debitosAprobados.map((d) => d.expediente));

    // Excluir: pago anual registrado
    const pagosAnuales = await prisma.pagoAnual.findMany({
        where: { expediente: { in: expedientes } },
        select: { expediente: true },
    });
    const setAnual = new Set(pagosAnuales.map((p) => p.expediente));

    const matriculadosFiltrados = datos.filter(
        (d) => !setDebito.has(d.expediente!) && !setAnual.has(d.expediente!)
    );
    const expFiltrados = matriculadosFiltrados.map((d) => d.expediente as string);

    // Cuotas del período actual
    const cuotas = await prisma.cuotaMensual.findMany({
        where: { expediente: { in: expFiltrados }, periodo },
    });
    const mapCuotas = new Map(cuotas.map((c) => [c.expediente, c]));

    // Deudas
    const deudas = await prisma.deuda.findMany({
        where: { expediente: { in: expFiltrados } },
    });
    const mapDeudas = new Map<string, { total: number; count: number }>();
    for (const d of deudas) {
        const prev = mapDeudas.get(d.expediente) ?? { total: 0, count: 0 };
        mapDeudas.set(d.expediente, { total: prev.total + d.monto, count: prev.count + 1 });
    }

    // PagosPendientes para detectar método de pago (transferencia)
    const pagosPendientes = await prisma.pagoPendiente.findMany({
        where: { expediente: { in: expFiltrados }, tipo: "matricula_mensual" },
        select: { expediente: true, ref: true, estado: true },
    });
    const mapMetodoByCuotaId = new Map<string, string>();
    for (const pp of pagosPendientes) {
        mapMetodoByCuotaId.set(pp.ref, pp.estado);
    }

    // Stats del mes
    const cuotasPagadas = cuotas.filter((c) => c.estado === "pagado");
    const totalRecaudado = cuotasPagadas.reduce((acc, c) => acc + c.monto, 0);
    const pagadasPorTransferencia = cuotasPagadas.filter((c) => {
        const ppEstado = mapMetodoByCuotaId.get(String(c.id));
        return ppEstado === "aprobado";
    }).length;
    const pagadasPorMP = cuotasPagadas.length - pagadasPorTransferencia;
    const totalDeudaAcumulada = [...mapDeudas.values()].reduce((acc, d) => acc + d.total, 0);

    const stats = {
        totalMatriculados: expFiltrados.length,
        cuotaGenerada: cuotas.length,
        cuotaPagada: cuotasPagadas.length,
        cuotaPendiente: cuotas.filter((c) => c.estado === "pendiente").length,
        sinCuota: expFiltrados.length - cuotas.length,
        pagadasPorMP,
        pagadasPorTransferencia,
        totalRecaudado,
        conDeuda: [...mapDeudas.values()].filter((d) => d.total > 0).length,
        totalDeudaAcumulada,
    };

    const resultado = matriculadosFiltrados.map((d) => {
        const exp = d.expediente as string;
        const cuota = mapCuotas.get(exp) ?? null;
        const deuda = mapDeudas.get(exp) ?? null;

        type MetodoCuota = "mercadopago" | "transferencia" | "transferencia_pendiente" | null;
        let metodoCuota: MetodoCuota = null;

        if (cuota) {
            const ppEstado = mapMetodoByCuotaId.get(String(cuota.id));
            if (cuota.estado === "pagado") {
                metodoCuota = ppEstado === "aprobado" ? "transferencia" : "mercadopago";
            } else if (ppEstado === "pendiente") {
                metodoCuota = "transferencia_pendiente";
            }
        }

        return {
            expediente: exp,
            nombre: d.nombre,
            apellido: d.apellido,
            cuota: cuota ? {
                id: cuota.id,
                periodo: cuota.periodo,
                monto: cuota.monto,
                estado: cuota.estado,
                fechaPago: cuota.fechaPago,
                metodo: metodoCuota,
            } : null,
            deudaTotal: deuda?.total ?? 0,
            deudaCount: deuda?.count ?? 0,
        };
    });

    // Ordenar: con deuda → cuota pendiente → al día → alfabético
    resultado.sort((a, b) => {
        const scoreA = (a.deudaTotal > 0 ? 2 : 0) + (a.cuota?.estado === "pendiente" ? 1 : 0);
        const scoreB = (b.deudaTotal > 0 ? 2 : 0) + (b.cuota?.estado === "pendiente" ? 1 : 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.apellido.localeCompare(b.apellido);
    });

    return NextResponse.json({ periodo, stats, usuarios: resultado });
}
