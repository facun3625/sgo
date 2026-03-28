export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getSession();
    const isAdmin = (lvl: string) => lvl === "superadmin" || lvl === "admin";
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ count: 0 });

    const count = await prisma.mensajeChat.count({
        where: {
            de: "user",
            leido: false,
        },
    });

    return NextResponse.json({ count });
}
