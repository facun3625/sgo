import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const [solicitudes, adhesiones] = await Promise.all([
            prisma.solicitud.findMany({
                where: { expediente: session.expediente },
                orderBy: { fecha: 'desc' }
            }),
            prisma.adhesionDebito.findMany({
                where: { expediente: session.expediente },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // Transformar adhesiones al formato de solicitud
        const adhesionesTransformadas = adhesiones.map(a => ({
            id: `ad-${a.id}`, // ID único prefijado
            tipo: `Adhesión a Débito - ${a.tipoAdhesion}`,
            fecha: a.createdAt,
            estado: a.estado,
            presentarAnte: null,
            emailLegal: null,
            adjunto: a.tipoAdhesion === "CBU" ? a.constanciaCbu : a.frontalTarjeta,
            detalles: {
                tipoAdhesion: a.tipoAdhesion,
                dni: a.dniFrontal,
                cbu: a.constanciaCbu,
                tarjeta: a.frontalTarjeta
            },
            isAdhesion: true
        }));

        const total = [...solicitudes, ...adhesionesTransformadas].sort((a, b) =>
            new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );

        return NextResponse.json(total);
    } catch (error) {
        console.error("Error al obtener solicitudes:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const contentType = request.headers.get("content-type") || "";
        let tipo, presentarAnte, emailLegal, detalles, adjuntoPath;

        if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            tipo = formData.get("tipo") as string;
            presentarAnte = formData.get("presentarAnte") as string;
            emailLegal = formData.get("emailLegal") as string;
            const detallesStr = formData.get("detalles") as string;
            detalles = detallesStr ? JSON.parse(detallesStr) : {};

            const file = formData.get("archivo") as File;
            if (file && file.size > 0) {
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);

                const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                const path = join(process.cwd(), "public/uploads/solicitudes", fileName);
                await writeFile(path, buffer);
                adjuntoPath = `/uploads/solicitudes/${fileName}`;
            }
        } else {
            const body = await request.json();
            ({ tipo, presentarAnte, emailLegal, detalles } = body);
        }

        const nuevaSolicitud = await prisma.solicitud.create({
            data: {
                expediente: session.expediente || "",
                tipo: tipo || "Trámite General",
                presentarAnte: presentarAnte || null,
                emailLegal: emailLegal || null,
                adjunto: adjuntoPath || null,
                detalles: detalles || {},
                estado: "pendiente"
            }
        });

        return NextResponse.json(nuevaSolicitud);
    } catch (error) {
        console.error("Error al crear solicitud:", error);
        return NextResponse.json({ error: "Error interno del servidor", details: error instanceof Error ? error.message : "Desconocido" }, { status: 500 });
    }
}
