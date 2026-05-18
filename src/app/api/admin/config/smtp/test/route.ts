export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { enviarTokenRecuperacion } from "@/lib/mailer";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel))
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { email } = await req.json();
    if (!email?.trim()) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

    try {
        await enviarTokenRecuperacion(email.trim(), "TEST-1234");
        return NextResponse.json({ success: true });
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
