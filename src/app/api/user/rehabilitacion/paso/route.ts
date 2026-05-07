import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { crearNotificacion } from "@/lib/notificaciones";

const UPLOAD_DIR = join(process.cwd(), "public/uploads/rehabilitacion");

async function saveFile(file: File | null, prefix: string, expediente: string): Promise<string | null> {
    if (!file || file.size === 0) return null;
    await mkdir(UPLOAD_DIR, { recursive: true });
    const bytes = await file.arrayBuffer();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const name = `${Date.now()}_${prefix}_${expediente}.${ext}`;
    await writeFile(join(UPLOAD_DIR, name), Buffer.from(bytes));
    return `/uploads/rehabilitacion/${name}`;
}

export async function PATCH(req: NextRequest) {
    const session = await getSession();
    if (!session?.expediente) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const expediente = session.expediente;

    const fd = await req.formData();
    const paso = Number(fd.get("paso"));

    const solicitud = await prisma.solicitudRehabilitacion.findFirst({
        where: { expediente, estado: "borrador" },
        orderBy: { createdAt: "desc" },
    });
    if (!solicitud) return NextResponse.json({ error: "Sin solicitud activa" }, { status: 404 });

    let update: Record<string, unknown> = {};

    if (paso === 1) {
        const metodo = fd.get("metodo") as string;
        if (metodo === "mercadopago") {
            // Verificar que la deuda fue efectivamente saldada
            const deudas = await prisma.deuda.findMany({ where: { expediente } });
            const actual = deudas.reduce((a, d) => a + d.monto, 0);
            if (actual > 0) return NextResponse.json({ error: "La deuda aún no fue acreditada en el sistema." }, { status: 400 });
            // Guardar referencia a los pagos MP que cancelaron la deuda
            const pagados = await prisma.deudaPagada.findMany({
                where: { expediente, metodoPago: "mercadopago" },
                orderBy: { fechaPago: "desc" },
                take: 10,
            });
            const mpIds = pagados.map(p => p.mpPaymentId).filter(Boolean).join(",");
            update = { p1Metodo: "mercadopago", p1MpPaymentId: mpIds || null, p1Ok: true, pasoActual: 2 };
        } else if (metodo === "transferencia") {
            const file = fd.get("comprobante") as File;
            const url = await saveFile(file, "p1", expediente);
            if (!url) return NextResponse.json({ error: "El comprobante es requerido" }, { status: 400 });
            update = { p1Metodo: "transferencia", p1Comprobante: url, p1Ok: true, pasoActual: 2 };
        } else {
            return NextResponse.json({ error: "Método inválido" }, { status: 400 });
        }
    } else if (paso === 2) {
        const desde = (fd.get("desde") as string)?.trim();
        const razon = (fd.get("razon") as string)?.trim();
        if (!desde || !razon) return NextResponse.json({ error: "Completá todos los campos del formulario" }, { status: 400 });
        update = { p2Desde: desde, p2Razon: razon, p2Ok: true, pasoActual: 3 };
    } else if (paso === 3) {
        const file = fd.get("pdf") as File;
        const url = await saveFile(file, "p3_reincidencia", expediente);
        if (!url) return NextResponse.json({ error: "El PDF es requerido" }, { status: 400 });
        update = { p3Pdf: url, p3Ok: true, pasoActual: 4 };
    } else if (paso === 4) {
        const tipo = (fd.get("tipo") as string)?.trim();
        const dniFile = fd.get("dni") as File;
        const docFile = fd.get("doc") as File;
        const dniUrl = await saveFile(dniFile, "p4_dni", expediente);
        const docUrl = await saveFile(docFile, "p4_doc", expediente);
        if (!tipo || !dniUrl || !docUrl) return NextResponse.json({ error: "Completá todos los datos de adhesión" }, { status: 400 });
        update = { p4Tipo: tipo, p4Dni: dniUrl, p4Doc: docUrl, p4Ok: true, pasoActual: 5 };
    } else if (paso === 5) {
        const metodo = fd.get("metodo") as string;
        if (metodo === "transferencia") {
            const file = fd.get("comprobante") as File;
            const url = await saveFile(file, "p5", expediente);
            if (!url) return NextResponse.json({ error: "El comprobante es requerido" }, { status: 400 });
            update = { p5Metodo: "transferencia", p5Comprobante: url, p5Ok: true, estado: "pendiente" };
        } else {
            return NextResponse.json({ error: "Método inválido" }, { status: 400 });
        }
    } else {
        return NextResponse.json({ error: "Paso inválido" }, { status: 400 });
    }

    const updated = await prisma.solicitudRehabilitacion.update({
        where: { id: solicitud.id },
        data: update,
    });

    // Notificar admins cuando el trámite queda pendiente
    if (updated.estado === "pendiente") {
        const admins = await prisma.user.findMany({
            where: { accessLevel: { in: ["admin", "superadmin"] } },
            select: { expediente: true },
        });
        const dato = await prisma.dato.findFirst({ where: { expediente }, select: { nombre: true, apellido: true } });
        const nombre = dato ? `${dato.apellido}, ${dato.nombre}` : `Mat. ${expediente}`;
        await prisma.notificacion.createMany({
            data: admins.filter(a => a.expediente).map(a => ({
                expediente: a.expediente!,
                titulo: "Nueva solicitud de rehabilitación",
                mensaje: `${nombre} completó el trámite y solicita rehabilitación de matrícula.`,
                tipo: "general",
            })),
        });
    }

    return NextResponse.json({ solicitud: updated });
}
