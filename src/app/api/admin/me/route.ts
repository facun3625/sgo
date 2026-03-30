import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await getSession();
    if (!session || (session.accessLevel !== "admin" && session.accessLevel !== "superadmin")) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.accessLevel === "superadmin") {
        return NextResponse.json({ accessLevel: "superadmin", permisos: null });
    }

    const user = await prisma.user.findUnique({
        where: { expediente: session.expediente },
        select: { permisos: true, accessLevel: true },
    });

    let permisos: string[] = [];
    try { permisos = JSON.parse(user?.permisos || "[]"); } catch { permisos = []; }

    return NextResponse.json({ accessLevel: "admin", permisos });
}
