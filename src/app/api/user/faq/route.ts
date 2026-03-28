import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    const categorias = await prisma.faqCategoria.findMany({
        orderBy: { orden: "asc" },
        include: { faqs: { orderBy: { orden: "asc" } } },
    });
    return NextResponse.json(categorias);
}
