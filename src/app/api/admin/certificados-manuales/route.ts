import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

const MENSAJE_DEFAULT =
    "Tu Certificado de Matriculación se genera de forma manual. Debe ser retirado personalmente en la sede del Colegio.";

// GET: listado de expedientes bloqueados (con nombre) + el texto del cartel
export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const [bloqueados, config] = await Promise.all([
        prisma.certificadoManual.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.config.findUnique({ where: { clave: "certificadoManualMensaje" } }),
    ]);

    const expedientes = bloqueados.map(b => b.expediente);
    const datos = expedientes.length > 0
        ? await prisma.dato.findMany({ where: { expediente: { in: expedientes } }, select: { expediente: true, nombre: true, apellido: true } })
        : [];
    const datosMap = new Map(datos.map(d => [d.expediente, d]));

    return NextResponse.json({
        bloqueados: bloqueados.map(b => ({
            id: b.id,
            expediente: b.expediente,
            nombre: datosMap.get(b.expediente)?.nombre ?? null,
            apellido: datosMap.get(b.expediente)?.apellido ?? null,
            createdAt: b.createdAt,
        })),
        mensaje: config?.valor ?? MENSAJE_DEFAULT,
    });
}

// POST: agrega expedientes a la lista de bloqueo (no reemplaza los ya cargados)
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { expedientes } = await req.json() as { expedientes: string[] };
    const limpios = [...new Set((expedientes ?? []).map(e => String(e).trim()).filter(Boolean))];
    if (limpios.length === 0) return NextResponse.json({ error: "Sin expedientes válidos" }, { status: 400 });

    const existentes = await prisma.certificadoManual.findMany({
        where: { expediente: { in: limpios } },
        select: { expediente: true },
    });
    const yaExisten = new Set(existentes.map(e => e.expediente));
    const nuevos = limpios.filter(e => !yaExisten.has(e));

    if (nuevos.length > 0) {
        await prisma.certificadoManual.createMany({ data: nuevos.map(expediente => ({ expediente })) });
    }

    return NextResponse.json({ agregados: nuevos.length, yaEstaban: limpios.length - nuevos.length });
}

// PUT: guarda el texto del cartel que ve el matriculado bloqueado
export async function PUT(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { mensaje } = await req.json() as { mensaje: string };
    if (!mensaje?.trim()) return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });

    await prisma.config.upsert({
        where: { clave: "certificadoManualMensaje" },
        update: { valor: mensaje.trim() },
        create: { clave: "certificadoManualMensaje", valor: mensaje.trim() },
    });

    return NextResponse.json({ ok: true });
}
