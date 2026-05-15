import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const expediente = session.expediente;
        if (!expediente) {
            return NextResponse.json({ misFiador: null, avalaA: [] });
        }

        const [miRelacion, soyFiadorDe] = await Promise.all([
            prisma.fiador.findUnique({ where: { expediente } }),
            prisma.fiador.findMany({ where: { fiadorExpediente: expediente } }),
        ]);

        let misFiador = null;
        if (miRelacion) {
            const dato = await prisma.dato.findFirst({
                where: { expediente: miRelacion.fiadorExpediente },
                select: { expediente: true, apellido: true, nombre: true },
            });
            misFiador = {
                expediente: miRelacion.fiadorExpediente,
                apellido: dato?.apellido ?? null,
                nombre: dato?.nombre ?? null,
            };
        }

        const avalaA = await Promise.all(
            soyFiadorDe.map(async (rel) => {
                const dato = await prisma.dato.findFirst({
                    where: { expediente: rel.expediente },
                    select: { expediente: true, apellido: true, nombre: true },
                });
                return {
                    expediente: rel.expediente,
                    apellido: dato?.apellido ?? null,
                    nombre: dato?.nombre ?? null,
                };
            })
        );

        return NextResponse.json({ misFiador, avalaA });
    } catch {
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
