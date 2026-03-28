export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getSession();
    if (!session?.expediente) return NextResponse.json({ count: 0 });

    const count = await prisma.mensajeChat.count({
        where: {
            de: "admin",
            leido: false,
            conversacion: { expediente: session.expediente },
        },
    });

    return NextResponse.json({ count });
}
