import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(accessLevel: string) {
    return accessLevel === "superadmin" || accessLevel === "admin";
}

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const config = await prisma.tokenConfig.findUnique({ where: { id: 1 } });
    return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { precio, stock, limiteMensual, activo } = await req.json();

    const config = await prisma.tokenConfig.upsert({
        where: { id: 1 },
        create: { id: 1, precio, stock, limiteMensual, activo },
        update: { precio, stock, limiteMensual, activo },
    });

    return NextResponse.json(config);
}
