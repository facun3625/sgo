import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getSession();

        if (!session || !session.expediente) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const expediente = session.expediente;

        // Fetch de todos los conceptos financieros en paralelo
        const [
            deudas,
            matriculaAnual,
            matriculaMensual,
            debitoAutomatico,
            pagoAnual
        ] = await Promise.all([
            prisma.deuda.findMany({ where: { expediente } }),
            prisma.matriculaAnual.findMany({ where: { expediente } }),
            prisma.matriculaMensual.findMany({ where: { expediente } }),
            prisma.debitoAutomatico.findFirst({ where: { expediente } }),
            prisma.pagoAnual.findFirst({ where: { expediente } })
        ]);

        return NextResponse.json({
            deudas,
            matriculaAnual,
            matriculaMensual,
            hasDebitoAutomatico: !!debitoAutomatico,
            hasPagoAnualActivo: !!pagoAnual,
            montoAnual: matriculaAnual[0]?.monto || 48000,
            montoMensual: matriculaMensual[0]?.monto || 4500,
            totalDeuda: deudas.reduce((acc, curr) => acc + curr.monto, 0)
        });

    } catch (error) {
        console.error("Error fetching pagos:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
