import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { pregunta, respuesta, orden } = await req.json();
    const faq = await prisma.faq.update({
        where: { id: parseInt(id) },
        data: {
            ...(pregunta !== undefined && { pregunta }),
            ...(respuesta !== undefined && { respuesta }),
            ...(orden !== undefined && { orden }),
        },
    });
    return NextResponse.json(faq);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await prisma.faq.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ ok: true });
}
