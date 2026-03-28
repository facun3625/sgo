import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { nombre, orden } = await req.json();
    const cat = await prisma.faqCategoria.update({
        where: { id: parseInt(id) },
        data: { ...(nombre !== undefined && { nombre }), ...(orden !== undefined && { orden }) },
    });
    return NextResponse.json(cat);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await prisma.faqCategoria.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ ok: true });
}
