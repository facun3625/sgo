import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { crearNotificacion } from "@/lib/notificaciones";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const { accion, nota } = await req.json();
    if (!["aprobar", "rechazar"].includes(accion)) return NextResponse.json({ error: "Acción inválida" }, { status: 400 });

    const pago = await prisma.pagoPendiente.findUnique({ where: { id: parseInt(id) } });
    if (!pago) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    if (pago.estado !== "pendiente") return NextResponse.json({ error: "Este pago ya fue procesado" }, { status: 400 });

    if (accion === "rechazar") {
        await prisma.pagoPendiente.update({ where: { id: pago.id }, data: { estado: "rechazado", nota: nota ?? null } });
        await crearNotificacion(pago.expediente, "Transferencia rechazada",
            nota ? `Tu comprobante fue rechazado: ${nota}` : "Tu comprobante de transferencia fue rechazado. Contactá con administración.",
            "pago");
        return NextResponse.json({ ok: true });
    }

    // ── Aprobar: aplicar según tipo ──────────────────────────────────────────
    const { tipo, ref, expediente } = pago;

    const fechaPago = new Date();

    if (tipo === "matricula_mensual") {
        const cuota = await prisma.cuotaMensual.findUnique({ where: { id: parseInt(ref) } });
        if (cuota && cuota.estado !== "pagado") {
            await prisma.cuotaMensual.update({ where: { id: cuota.id }, data: { estado: "pagado", metodoPago: "transferencia", fechaPago } });
        }
        await crearNotificacion(expediente, "Cuota acreditada",
            `Tu transferencia para la cuota ${cuota?.periodo ?? ""} fue aprobada y acreditada.`, "pago");

    } else if (tipo === "matricula_anual") {
        const existente = await prisma.pagoAnual.findFirst({ where: { expediente } });
        if (!existente) await prisma.pagoAnual.create({ data: { expediente, fechaPago } });
        await crearNotificacion(expediente, "Matrícula anual acreditada",
            "Tu transferencia de matrícula anual fue aprobada. ¡Gracias!", "pago");

    } else if (tipo === "deuda") {
        const ids = ref.split(",").map((x: string) => parseInt(x)).filter((x: number) => !isNaN(x));
        const deudas = await prisma.deuda.findMany({ where: { id: { in: ids }, expediente } });
        const montoTotal = deudas.reduce((acc, d) => acc + d.monto, 0);
        await prisma.$transaction([
            prisma.deudaPagada.create({ data: { expediente, monto: montoTotal, metodoPago: "transferencia", fechaPago } }),
            prisma.deuda.deleteMany({ where: { id: { in: ids }, expediente } }),
        ]);
        await crearNotificacion(expediente, "Deuda saldada",
            "Tu transferencia fue aprobada y la deuda ha sido cancelada.", "pago");

    } else if (tipo === "curso") {
        const inscripcion = await prisma.inscripcionCurso.findUnique({
            where: { id: parseInt(ref) }, include: { curso: true, opcion: true },
        });
        if (inscripcion && inscripcion.estado !== "confirmada") {
            await prisma.inscripcionCurso.update({
                where: { id: inscripcion.id },
                data: { estado: "confirmada", metodoPago: "transferencia" },
            });
            if (inscripcion.opcionId) {
                await prisma.cursoOpcion.update({ where: { id: inscripcion.opcionId }, data: { inscritos: { increment: 1 } } });
            }
            await crearNotificacion(expediente, "Inscripción confirmada",
                `Tu transferencia para el curso "${inscripcion.curso.titulo}" fue aprobada.`, "curso");
        }
    }

    await prisma.pagoPendiente.update({ where: { id: pago.id }, data: { estado: "aprobado", nota: nota ?? null } });
    return NextResponse.json({ ok: true });
}
