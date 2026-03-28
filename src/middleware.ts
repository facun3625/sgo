import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || "dev-secret-local-no-importa"
);

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Proteger rutas /admin
    if (pathname.startsWith("/admin")) {
        const token = req.cookies.get("sgo-session")?.value;

        if (!token) {
            return NextResponse.redirect(new URL("/login", req.url));
        }

        try {
            const { payload } = await jwtVerify(token, secret);
            const accessLevel = (payload as any).accessLevel;

            if (accessLevel !== "superadmin" && accessLevel !== "admin") {
                return NextResponse.redirect(new URL("/dashboard", req.url));
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
