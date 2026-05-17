import { NextResponse } from "next/server";
import { getSession, ADMIN_COOKIE_NAME } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST() {
    const session = await getSession();
    if (!session?._impersonando)
        return NextResponse.json({ error: "No estás en modo impersonación" }, { status: 400 });

    const cookieStore = await cookies();
    const adminToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

    if (!adminToken)
        return NextResponse.json({ error: "No se encontró la sesión admin original" }, { status: 400 });

    // Restaurar sesión admin
    cookieStore.set("sgo-session", adminToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
    });

    // Limpiar cookie de backup
    cookieStore.delete(ADMIN_COOKIE_NAME);

    return NextResponse.json({ ok: true });
}
