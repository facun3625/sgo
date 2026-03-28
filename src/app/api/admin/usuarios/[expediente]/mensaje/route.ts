import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { crearNotificacion } from "@/lib/notificaciones";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function POST(req: NextRequest, { params }: { params: Promise<{ expediente: string }> }) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { expediente } = await params;
    const { titulo, mensaje } = await req.json();

    if (!titulo?.trim() || !mensaje?.trim()) return NextResponse.json({ error: "Título y mensaje requeridos" }, { status: 400 });

    await crearNotificacion(expediente, titulo.trim(), mensaje.trim(), "general");
    return NextResponse.json({ ok: true });
}
