import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { obtenerComprobantesDeuda, parseIdsDeuda } from "@/lib/pagoDeuda";

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session?.expediente) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { tipo, ref, monto, comprobante } = await req.json();
    const expediente = session.expediente;

    if (!tipo || !ref || !monto || !comprobante) {
        return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    // Verificar que el tipo de transferencia esté habilitado
    const configKey = `transferencia_${tipo.replace("matricula_", "matricula_")}`;
    const config = await prisma.config.findUnique({ where: { clave: configKey } });
    if (!config || config.valor !== "1") {
        return NextResponse.json({ error: "Transferencia no habilitada para esta sección" }, { status: 400 });
    }

    // Validar que la entidad existe y corresponde al expediente
    if (tipo === "matricula_mensual") {
        const cuota = await prisma.cuotaMensual.findUnique({ where: { id: parseInt(ref) } });
        if (!cuota || cuota.expediente !== expediente) return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 });
        if (cuota.estado === "pagado") return NextResponse.json({ error: "Esta cuota ya fue abonada" }, { status: 400 });

    } else if (tipo === "matricula_anual") {
        const existente = await prisma.pagoAnual.findFirst({ where: { expediente } });
        if (existente) return NextResponse.json({ error: "Ya tenés el pago anual registrado" }, { status: 400 });

    } else if (tipo === "deuda") {
        const ids = parseIdsDeuda(ref);
        const comprobantes = await obtenerComprobantesDeuda(expediente, ids);
        if (comprobantes.length === 0) return NextResponse.json({ error: "Comprobantes no encontrados" }, { status: 404 });

    } else if (tipo === "curso") {
        const inscripcion = await prisma.inscripcionCurso.findUnique({ where: { id: parseInt(ref) } });
        if (!inscripcion || inscripcion.expediente !== expediente) return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });
        if (inscripcion.estado === "confirmada") return NextResponse.json({ error: "Esta inscripción ya está pagada" }, { status: 400 });
    }

    // Verificar que no haya ya un pago pendiente para el mismo concepto
    const yaExiste = await prisma.pagoPendiente.findFirst({
        where: { expediente, tipo, ref, estado: "pendiente" },
    });
    if (yaExiste) return NextResponse.json({ error: "Ya tenés un comprobante enviado esperando aprobación" }, { status: 400 });

    const pago = await prisma.pagoPendiente.create({
        data: { expediente, tipo, ref, monto: parseFloat(monto), comprobante },
    });

    return NextResponse.json(pago);
}
