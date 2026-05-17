import { NextRequest, NextResponse } from "next/server";
import { getSession, ADMIN_COOKIE_NAME } from "@/lib/auth";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

const secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || "dev-secret-local-no-importa"
);

export async function POST(req: NextRequest, { params }: { params: Promise<{ expediente: string }> }) {
    const session = await getSession();
    if (!session || session.accessLevel !== "superadmin")
        return NextResponse.json({ error: "Solo superadmin puede impersonar usuarios" }, { status: 403 });

    const { expediente } = await params;

    const user = await prisma.user.findFirst({
        where: { expediente },
        select: { id: true, expediente: true, nombre: true, apellido: true, accessLevel: true },
    });

    if (!user)
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    if (user.accessLevel !== "user")
        return NextResponse.json({ error: "Solo se puede impersonar usuarios con rol 'user'" }, { status: 400 });

    const cookieStore = await cookies();

    // Guardar sesión admin original
    const originalToken = cookieStore.get("sgo-session")?.value;
    if (originalToken) {
        cookieStore.set(ADMIN_COOKIE_NAME, originalToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 4, // 4 horas
        });
    }

    // Crear sesión como el usuario target
    const token = await new SignJWT({
        id: user.id,
        expediente: user.expediente ?? "",
        nombre: user.nombre,
        apellido: user.apellido,
        accessLevel: "user",
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
