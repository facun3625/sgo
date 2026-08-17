export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logAdmin } from "@/lib/admin-log";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const [datos, users, deudas] = await Promise.all([
        prisma.dato.findMany({ orderBy: [{ apellido: "asc" }, { nombre: "asc" }] }),
        prisma.user.findMany({ select: { expediente: true, status: true, cod: true } }),
        prisma.deuda.findMany({ select: { expediente: true, monto: true } }),
    ]);

    const userMap = new Map(users.map(u => [u.expediente ?? u.cod, u]));
    const deudaMap = new Map<string, number>();
    for (const d of deudas) deudaMap.set(d.expediente, (deudaMap.get(d.expediente) ?? 0) + d.monto);

    const result = datos.map(d => {
        const u = userMap.get(d.expediente ?? "") || userMap.get(d.cod);
        return {
            cod: d.cod,
            expediente: d.expediente,
            folio: d.folio,
            tomo: d.tomo,
            tipo: d.tipo,
            nombre: d.nombre,
            apellido: d.apellido,
            emailLegal: d.emailLegal,
            status: u?.status ?? "active",
            tieneUsuario: !!u,
            deudaTotal: deudaMap.get(d.expediente ?? "") ?? 0,
        };
    });

    return NextResponse.json({ usuarios: result, isSuperAdmin: session.accessLevel === "superadmin" });
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { apellido, nombre, expediente, cod: codInput, tomo, folio, email, password } = await req.json();

    if (!apellido?.trim() || !nombre?.trim())
        return NextResponse.json({ error: "Apellido y nombre son requeridos" }, { status: 400 });
    if (!password?.trim() || password.trim().length < 6)
        return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });

    // Generar cod único si no se provee
    const cod = codInput?.trim() || `M${Date.now()}`;

    if (await prisma.dato.findUnique({ where: { cod } }))
        return NextResponse.json({ error: "El N° de cliente ya existe" }, { status: 409 });
    if (expediente?.trim() && await prisma.dato.findFirst({ where: { expediente: expediente.trim() } }))
        return NextResponse.json({ error: "El expediente ya existe" }, { status: 409 });

    const hashedPassword = await bcrypt.hash(password.trim(), 12);

    const [dato] = await prisma.$transaction([
        prisma.dato.create({
            data: {
                cod,
                apellido: apellido.trim().toUpperCase(),
                nombre: nombre.trim().toUpperCase(),
                expediente: expediente?.trim() || null,
                tomo: tomo?.trim() || null,
                folio: folio?.trim() || null,
                emailLegal: email?.trim() || null,
            },
        }),
        prisma.user.create({
            data: {
                cod,
                apellido: apellido.trim().toUpperCase(),
                nombre: nombre.trim().toUpperCase(),
                expediente: expediente?.trim() || null,
                password: hashedPassword,
            },
        }),
    ]);

    await logAdmin({
        adminId: session.id,
        adminNombre: `${session.apellido}, ${session.nombre}`,
        expediente: expediente?.trim() || null,
        modulo: "usuarios",
        accion: "Alta manual de matrícula",
        detalle: { cod, expediente: expediente?.trim() || null },
        req,
    });

    return NextResponse.json({
        cod: dato.cod,
        expediente: dato.expediente,
        folio: dato.folio, tomo: dato.tomo, tipo: null,
        nombre: dato.nombre,
        apellido: dato.apellido,
        emailLegal: dato.emailLegal,
        status: "active",
        tieneUsuario: true,
    }, { status: 201 });
}
