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

    // Unión Dato.expediente + User.expediente (no admin). Dato tiene prioridad en nombres.
    const [datosTodos, usersTodos] = await Promise.all([
        prisma.dato.findMany({
            where: { expediente: { not: null } },
            select: { expediente: true, nombre: true, apellido: true },
        }),
        prisma.user.findMany({
            where: {
                expediente: { not: null },
                accessLevel: { notIn: ["admin", "superadmin"] },
            },
            select: { expediente: true, nombre: true, apellido: true },
        }),
    ]);

    const expMap = new Map<string, { nombre: string; apellido: string }>();
    for (const u of usersTodos) expMap.set(u.expediente!, { nombre: u.nombre, apellido: u.apellido });
    for (const d of datosTodos) expMap.set(d.expediente!, { nombre: d.nombre, apellido: d.apellido });

    const datos = Array.from(expMap.entries()).map(([expediente, info]) => ({
        expediente,
        nombre: info.nombre,
        apellido: info.apellido,
    }));

    const expedientes = datos.map((d) => d.expediente);

    // Determinar cobertura: débito activo (excluye CANCELACION) y pago anual
    const [debitosActivos, cancelacionesAprobadas, pagosAnuales] = await Promise.all([
        prisma.adhesionDebito.findMany({
            where: { expediente: { in: expedientes }, estado: "aprobada", tipoAdhesion: { not: "CANCELACION" } },
            select: { expediente: true },
        }),
        prisma.adhesionDebito.findMany({
            where: { expediente: { in: expedientes }, estado: "aprobada", tipoAdhesion: "CANCELACION" },
            select: { expediente: true },
        }),
        prisma.pagoAnual.findMany({
            where: { expediente: { in: expedientes } },
            select: { expediente: true },
        }),
    ]);

    const setCancelados = new Set(cancelacionesAprobadas.map((d) => d.expediente));
    // Débito activo solo si tiene adhesión aprobada no-CANCELACION Y no tiene cancelación aprobada
    const setDebito = new Set(
        debitosActivos.filter((d) => !setCancelados.has(d.expediente)).map((d) => d.expediente)
    );
    const setAnual = new Set(pagosAnuales.map((p) => p.expediente));

    // Solo pagan cuota mensual quienes no tienen débito activo ni pago anual
    const expFiltrados = expedientes.filter((exp) => !setDebito.has(exp) && !setAnual.has(exp));

    // Cuotas del período actual (solo para pagadores mensuales)
    const cuotas = await prisma.cuotaMensual.findMany({
        where: { expediente: { in: expFiltrados }, periodo },
    });
    const mapCuotas = new Map(cuotas.map((c) => [c.expediente, c]));

    // Deudas para TODOS los expedientes (no solo mensuales)
    const deudas = await prisma.deuda.findMany({
        where: { expediente: { in: expedientes } },
    });
    const mapDeudas = new Map<string, { total: number; count: number }>();
    for (const d of deudas) {
        const prev = mapDeudas.get(d.expediente) ?? { total: 0, count: 0 };
        mapDeudas.set(d.expediente, { total: prev.total + d.monto, count: prev.count + 1 });
    }

    // PagosPendientes para detectar método de pago (transferencia). Preferir "aprobado".
    const [pagosPendientes, transferenciasCount] = await Promise.all([
        prisma.pagoPendiente.findMany({
            where: { expediente: { in: expFiltrados }, tipo: "matricula_mensual" },
            select: { expediente: true, ref: true, estado: true },
        }),
        prisma.pagoPendiente.count({ where: { estado: "pendiente" } }),
    ]);
    const mapMetodoByCuotaId = new Map<string, string>();
    for (const pp of pagosPendientes) {
        const current = mapMetodoByCuotaId.get(pp.ref);
        if (!current || pp.estado === "aprobado") {
            mapMetodoByCuotaId.set(pp.ref, pp.estado);
        }
    }

    // Stats del mes
    const cuotasPagadas = cuotas.filter((c) => c.estado === "pagado");
    const totalRecaudado = cuotasPagadas.reduce((acc, c) => acc + c.monto, 0);
    const pagadasPorHomeBanking = cuotasPagadas.filter((c) => c.metodoPago === "home_banking" || c.metodoPago === "banelco").length;
    const pagadasPorTransferencia = cuotasPagadas.filter((c) => {
        if (c.metodoPago === "transferencia") return true;
        if (c.metodoPago === "mercadopago" || c.metodoPago === "home_banking" || c.metodoPago === "banelco") return false;
        // Fallback para cuotas históricas sin metodoPago
        const ppEstado = mapMetodoByCuotaId.get(String(c.id));
        return ppEstado === "aprobado";
    }).length;
    const pagadasPorMP = cuotasPagadas.length - pagadasPorTransferencia - pagadasPorHomeBanking;
    const totalDeudaAcumulada = [...mapDeudas.values()].reduce((acc, d) => acc + d.total, 0);

    const stats = {
        totalMatriculados: expedientes.length,
        conDebito: setDebito.size,
        conAnual: setAnual.size,
        cuotaGenerada: cuotas.length,
        cuotaPagada: cuotasPagadas.length,
        cuotaPendiente: cuotas.filter((c) => c.estado === "pendiente").length,
        sinCuota: expFiltrados.length - cuotas.length,
        pagadasPorMP,
        pagadasPorTransferencia,
        pagadasPorHomeBanking,
        totalRecaudado,
        conDeuda: [...mapDeudas.values()].filter((d) => d.total > 0).length,
        totalDeudaAcumulada,
        transferenciasPendientes: transferenciasCount,
    };

    type Cobertura = "mensual" | "debito" | "anual";
    type MetodoCuota = "mercadopago" | "transferencia" | "home_banking" | "banelco" | "transferencia_pendiente" | null;

    const resultado = datos.map((d) => {
        const exp = d.expediente;
        const cobertura: Cobertura = setDebito.has(exp) ? "debito" : setAnual.has(exp) ? "anual" : "mensual";
        const cuota = cobertura === "mensual" ? (mapCuotas.get(exp) ?? null) : null;
        const deuda = mapDeudas.get(exp) ?? null;

        let metodoCuota: MetodoCuota = null;
        if (cuota) {
            if (cuota.estado === "pagado") {
                if (cuota.metodoPago === "banelco") {
                    metodoCuota = "banelco";
                } else if (cuota.metodoPago === "home_banking") {
                    metodoCuota = "home_banking";
                } else if (cuota.metodoPago === "transferencia") {
                    metodoCuota = "transferencia";
                } else if (cuota.metodoPago === "mercadopago") {
                    metodoCuota = "mercadopago";
                } else {
                    // Fallback para cuotas históricas sin metodoPago
                    const ppEstado = mapMetodoByCuotaId.get(String(cuota.id));
                    metodoCuota = ppEstado === "aprobado" ? "transferencia" : "mercadopago";
                }
            } else {
                const ppEstado = mapMetodoByCuotaId.get(String(cuota.id));
                if (ppEstado === "pendiente") metodoCuota = "transferencia_pendiente";
            }
        }

        return {
            expediente: exp,
            nombre: d.nombre,
            apellido: d.apellido,
            cobertura,
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

    // Ordenar: con deuda + pendiente → solo pendiente → solo deuda → cubiertos → al día
    resultado.sort((a, b) => {
        const score = (u: typeof resultado[0]) => {
            if (u.deudaTotal > 0 && u.cuota?.estado === "pendiente") return 5;
            if (u.cuota?.estado === "pendiente") return 4;
            if (u.deudaTotal > 0) return 3;
            if (u.cobertura === "mensual" && !u.cuota) return 2; // sin cuota generada
            return 0;
        };
        const diff = score(b) - score(a);
        if (diff !== 0) return diff;
        return a.apellido.localeCompare(b.apellido);
    });

    return NextResponse.json({ periodo, stats, usuarios: resultado });
}
