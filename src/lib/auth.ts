import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || "dev-secret-local-no-importa"
);

const COOKIE_NAME = "sgo-session";

export interface SessionPayload {
    id: number;
    expediente: string;
    nombre: string;
    apellido: string;
    accessLevel: string;
    permisos?: string[];
    delegacionId?: number;
    delegacionNombre?: string;
    _impersonando?: boolean;
    _impersonadoPor?: string;
}

export const ADMIN_COOKIE_NAME = "sgo-admin-session";

export async function createSession(payload: SessionPayload) {
    const token = await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("24h")
        .setIssuedAt()
        .sign(secret);

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 24 horas
    });

    return token;
}

export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, secret);
        return payload as unknown as SessionPayload;
    } catch {
        return null;
    }
}

export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}
