import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { titulo, descripcion, fecha, tipo } = body;

        const event = await prisma.evento.create({
            data: {
                titulo,
                descripcion,
                fecha: new Date(fecha),
                tipo: tipo || "institucional"
            }
        });

        return NextResponse.json({ success: true, event });
    } catch (error) {
        console.error("Debug API Error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
