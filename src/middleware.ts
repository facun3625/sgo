import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || "dev-secret-local-no-importa"
);

// Routes that only superadmin can access
const SUPERADMIN_ONLY = ["/admin/config", "/admin/gestionar-admins", "/admin/config/sistema"];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (pathname.startsWith("/admin")) {
        const token = req.cookies.get("sgo-session")?.value;

        if (!token) {
            return NextResponse.redirect(new URL("/login", req.url));
        }

        try {
            const { payload } = await jwtVerify(token, secret);
            const accessLevel = (payload as any).accessLevel as string;
            const permisos: string[] = (payload as any).permisos || [];

            if (accessLevel !== "superadmin" && accessLevel !== "admin") {
                return NextResponse.redirect(new URL("/dashboard", req.url));
            }

            // Superadmin-only routes
            if (SUPERADMIN_ONLY.some(r => pathname.startsWith(r)) && accessLevel !== "superadmin") {
                return NextResponse.redirect(new URL("/admin", req.url));
            }

            // Per-section permission check for non-superadmin
            if (accessLevel === "admin") {
                // Extract the section key from pathname: /admin/{key}/... → key
                const parts = pathname.split("/").filter(Boolean); // ["admin", "solicitudes", ...]
                if (parts.length >= 2) {
                    const seccionKey = parts[1]; // e.g. "solicitudes"
                    // Dashboard (/admin only) is always allowed
                    const tieneAcceso = permisos.includes(seccionKey) ||
                        permisos.some(p => p.startsWith(seccionKey + ":"));
                    if (seccionKey && !tieneAcceso) {
                        return NextResponse.redirect(new URL("/admin", req.url));
                    }
                }
            }
        } catch {
            return NextResponse.redirect(new URL("/login", req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*"],
};
