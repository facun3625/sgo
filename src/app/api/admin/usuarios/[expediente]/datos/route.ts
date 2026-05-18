import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET(_: NextRequest, { params }: { params: Promise<{ expediente: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { expediente } = await params;
    const dato = await prisma.dato.findFirst({
        where: { OR: [{ expediente }, { cod: expediente }] },
    });
    if (!dato) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(dato);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ expediente: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { expediente } = await params;

    const dato = await prisma.dato.findFirst({
        where: { OR: [{ expediente }, { cod: expediente }] },
    });
    if (!dato) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const body = await req.json();
    const allowed = [
        "nombre", "apellido", "expediente", "folio", "tomo", "tipo", "documento", "cuil",
        "domicilioLegal", "postalLegal", "localidadLegal", "telefonosLegal", "emailLegal",
        "codMovilLegal", "movilLegal",
        "domicilioReal", "postalReal", "localidadReal", "provinciaReal",
        "telefonosReal", "codMovilReal", "movilReal", "emailReal",
        "fechaMatriculacion",
    ];
    const data: Record<string, any> = {};
    for (const key of allowed) {
        if (key in body) {
            data[key] = body[key] === "" ? null : body[key];
        }
    }
    if (data.fechaMatriculacion) {
        const parts = String(data.fechaMatriculacion).match(/^(\d{4})-(\d{2})-(\d{2})/);
        data.fechaMatriculacion = parts
            ? new Date(Date.UTC(+parts[1], +parts[2] - 1, +parts[3]))
            : new Date(data.fechaMatriculacion);
    }

    const updated = await prisma.dato.update({ where: { id: dato.id }, data });
    return NextResponse.json(updated);
}
