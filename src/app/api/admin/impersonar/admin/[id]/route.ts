export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession, ADMIN_COOKIE_NAME } from "@/lib/auth";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

const secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || "dev-secret-local-no-importa"
);

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.accessLevel !== "superadmin")
        return NextResponse.json({ error: "Solo superadmin puede impersonar administradores" }, { status: 403 });

    const { id } = await params;

    const user = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        select: { id: true, expediente: true, nombre: true, apellido: true, accessLevel: true, permisos: true },
    });

    if (!user)
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    if (user.accessLevel !== "admin")
        return NextResponse.json({ error: "El usuario no es administrador" }, { status: 400 });

    const cookieStore = await cookies();

    const originalToken = cookieStore.get("sgo-session")?.value;
    if (originalToken) {
        cookieStore.set(ADMIN_COOKIE_NAME, originalToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 4,
        });
    }

    let permisos: string[] = [];
    try { permisos = JSON.parse(user.permisos || "[]"); } catch { permisos = []; }

    const token = await new SignJWT({
        id: user.id,
        expediente: user.expediente ?? "",
        nombre: user.nombre,
        apellido: user.apellido,
        accessLevel: "admin",
        permisos,
        _impersonando: true,
        _impersonadoPor: `${session.apellido}, ${session.nombre}`,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("4h")
        .setIssuedAt()
        .sign(secret);

    cookieStore.set("sgo-session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 4,
    });

    return NextResponse.json({ ok: true });
}
