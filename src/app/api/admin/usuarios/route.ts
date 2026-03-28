export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(lvl: string) { return lvl === "superadmin" || lvl === "admin"; }

export async function GET() {
    const session = await getSession();
    if (!session || !isAdmin(session.accessLevel)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const [datos, users] = await Promise.all([
        prisma.dato.findMany({ orderBy: [{ apellido: "asc" }, { nombre: "asc" }] }),
        prisma.user.findMany({ select: { expediente: true, status: true, cod: true } }),
    ]);

    const userMap = new Map(users.map(u => [u.expediente ?? u.cod, u]));

    const result = datos.map(d => {
        const u = userMap.get(d.expediente ?? "") || userMap.get(d.cod);
        return {
            cod: d.cod,
            expediente: d.expediente,
            folio: d.folio,
            tomo: d.tomo,
            tipo: d.tipo,
            nombre: d.nombre,
            apellido: d.apellido,
            emailLegal: d.emailLegal,
            status: u?.status ?? "active",
            tieneUsuario: !!u,
        };
    });

    return NextResponse.json(result);
}
