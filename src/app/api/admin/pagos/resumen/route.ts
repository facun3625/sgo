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

    const periodo = new Date().toISOString().slice(0, 7); // "2026-04"

    // Todos los usuarios activos matriculados
    const users = await prisma.user.findMany({
        where: { status: "active", accessLevel: "user", registered: 1, NOT: { expediente: null } },
        select: { expediente: true, nombre: true, apellido: true },
    });
    const expedientes = users.map((u) => u.expediente as string);

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

    const usuariosFiltrados = users.filter(
        (u) => !setDebito.has(u.expediente!) && !setAnual.has(u.expediente!)
    );
    const expFiltrados = usuariosFiltrados.map((u) => u.expediente as string);

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

    // PagosPendientes para detectar método (transferencia vs MP)
    const pagosPendientes = await prisma.pagoPendiente.findMany({
        where: {
            expediente: { in: expFiltrados },
            tipo: "matricula_mensual",
        },
        select: { expediente: true, ref: true, estado: true },
    });
    // ref = cuotaId — buscar por cuotaId
    const mapMetodoByCuotaId = new Map<string, string>(); // cuotaId → estado de PagoPendiente
    for (const pp of pagosPendientes) {
        mapMetodoByCuotaId.set(pp.ref, pp.estado);
    }

    const resultado = usuariosFiltrados.map((u) => {
        const exp = u.expediente as string;
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
            nombre: u.nombre,
            apellido: u.apellido,
            cuota: cuota
                ? {
                      id: cuota.id,
                      periodo: cuota.periodo,
                      monto: cuota.monto,
                      estado: cuota.estado,
                      fechaPago: cuota.fechaPago,
                      metodo: metodoCuota,
                  }
                : null,
            deudaTotal: deuda?.total ?? 0,
            deudaCount: deuda?.count ?? 0,
        };
    });

    // Ordenar: con deuda primero → cuota pendiente → al día → alfabético
    resultado.sort((a, b) => {
        const scoreA = (a.deudaTotal > 0 ? 2 : 0) + (a.cuota?.estado === "pendiente" ? 1 : 0);
        const scoreB = (b.deudaTotal > 0 ? 2 : 0) + (b.cuota?.estado === "pendiente" ? 1 : 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.apellido.localeCompare(b.apellido);
    });

    return NextResponse.json({ periodo, usuarios: resultado });
}
