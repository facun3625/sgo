import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function mascarar(email: string): string {
    const [local, domain] = email.split("@");
    if (!domain) return email;
    const [domNombre, ...domResto] = domain.split(".");
    const mascLocal = local.length <= 2 ? local[0] + "***" : local.slice(0, 2) + "*".repeat(Math.min(local.length - 2, 4));
    const mascDom = domNombre.length <= 2 ? domNombre[0] + "**" : domNombre.slice(0, 2) + "*".repeat(Math.min(domNombre.length - 2, 3));
    return `${mascLocal}@${mascDom}.${domResto.join(".")}`;
}

export async function POST(req: NextRequest) {
    const { expediente } = await req.json();
    if (!expediente?.trim())
        return NextResponse.json({ error: "Ingresá tu número de expediente." }, { status: 400 });

    const dato = await prisma.dato.findFirst({
        where: { expediente: expediente.trim() },
        select: { emailLegal: true, emailReal: true },
    });

    if (!dato)
        return NextResponse.json({ error: "No se encontró un profesional con ese expediente." }, { status: 404 });

    const user = await prisma.user.findFirst({
        where: { expediente: expediente.trim() },
        select: { id: true },
    });

    if (!user)
        return NextResponse.json({ error: "Este profesional aún no tiene cuenta registrada en el sistema." }, { status: 404 });

    const correos: { id: string; mascara: string }[] = [];

    const legal = dato.emailLegal?.trim();
    const real = dato.emailReal?.trim();

    if (legal) correos.push({ id: "legal", mascara: mascarar(legal) });

    // Solo agregar real si es distinto al legal
    if (real && real.toLowerCase() !== legal?.toLowerCase())
        correos.push({ id: "real", mascara: mascarar(real) });

    if (correos.length === 0)
        return NextResponse.json({ error: "No hay correos registrados para este profesional. Comunicate con el CPASF." }, { status: 400 });

    return NextResponse.json({ correos });
}
