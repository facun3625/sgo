export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const firmas = await prisma.firmaAutoridad.findMany({ orderBy: { orden: "asc" } });
    return NextResponse.json(firmas);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { cargo } = await req.json();
    if (!cargo?.trim()) return NextResponse.json({ error: "cargo requerido" }, { status: 400 });
    const count = await prisma.firmaAutoridad.count();
    const firma = await prisma.firmaAutoridad.create({ data: { cargo: cargo.trim(), orden: count } });
    return NextResponse.json(firma);
}

export async function PATCH(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const body = await req.json();
    const { id, cargo, nombre, firma, enCredencial, enCertificado } = body;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    // Si se activa enCertificado, desactivar los demás
    if (enCertificado === true) {
        await prisma.firmaAutoridad.updateMany({ where: { id: { not: id } }, data: { enCertificado: false } });
    }

    const updated = await prisma.firmaAutoridad.update({
        where: { id },
        data: {
            ...(cargo !== undefined && { cargo }),
            ...(nombre !== undefined && { nombre }),
            ...(firma !== undefined && { firma }),
            ...(enCredencial !== undefined && { enCredencial }),
            ...(enCertificado !== undefined && { enCertificado }),
        },
    });
    return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await req.json();
    await prisma.firmaAutoridad.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
