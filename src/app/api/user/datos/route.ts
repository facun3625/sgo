import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { esCuitValido } from "@/lib/cuit";

const fieldLabels: Record<string, string> = {
    cuil: "CUIL",
    domicilioLegal: "Domicilio Legal",
    postalLegal: "Código Postal Legal",
    localidadLegal: "Localidad Legal",
    telefonosLegal: "Teléfonos Legal",
    emailLegal: "Email Legal",
    codMovilLegal: "Cód. Móvil Legal",
    movilLegal: "Móvil Legal",
    domicilioReal: "Domicilio Real",
    postalReal: "Código Postal Real",
    localidadReal: "Localidad Real",
    provinciaReal: "Provincia Real",
    telefonosReal: "Teléfonos Real",
    emailReal: "Email Real",
    codMovilReal: "Cód. Móvil Real",
    movilReal: "Móvil Real",
};

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const datos = await prisma.dato.findFirst({
            where: { expediente: session.expediente }
        });

        if (!datos) {
            return NextResponse.json({ error: "Datos no encontrados" }, { status: 404 });
        }

        return NextResponse.json(datos);
    } catch (error) {
        console.error("Error al obtener datos:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// Si se modifica el domicilio (real o legal), localidad y código postal de
// ese mismo lado pasan a ser obligatorios — para que Tango no reciba una
// dirección nueva sin saber a qué CP/localidad corresponde.
function errorDomicilioIncompleto(
    updateData: Record<string, unknown>,
    datoActual: Record<string, unknown> | null,
    lado: "Legal" | "Real"
): string | null {
    const domicilioKey = `domicilio${lado}`;
    if (!(domicilioKey in updateData)) return null;

    const nuevoDomicilio = String(updateData[domicilioKey] ?? "").trim();
    const domicilioAnterior = String(datoActual?.[domicilioKey] ?? "").trim();
    if (!nuevoDomicilio || nuevoDomicilio === domicilioAnterior) return null;

    const postalKey = `postal${lado}`;
    const localidadKey = `localidad${lado}`;
    const postalFinal = String((postalKey in updateData ? updateData[postalKey] : datoActual?.[postalKey]) ?? "").trim();
    const localidadFinal = String((localidadKey in updateData ? updateData[localidadKey] : datoActual?.[localidadKey]) ?? "").trim();
    if (!postalFinal || !localidadFinal) {
        return `Si modificás el domicilio ${lado === "Legal" ? "legal" : "real"}, completá también la localidad y el código postal correspondientes.`;
    }
    return null;
}

export async function PATCH(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await request.json();

        const sensitiveFields = [
            "id", "cod", "nombre", "apellido", "expediente",
            "folio", "tomo", "documento", "fechaMatriculacion",
            "createdAt", "updatedAt"
        ];

        const updateData = { ...body };
        sensitiveFields.forEach(field => delete updateData[field]);

        // Obtener datos actuales para calcular el diff
        const datoActual = await prisma.dato.findFirst({
            where: { expediente: session.expediente }
        });

        // cuil: se puede establecer solo si actualmente está vacío
        if ("cuil" in updateData && datoActual?.cuil) {
            delete updateData.cuil;
        }

        if ("cuil" in updateData && !esCuitValido(String(updateData.cuil ?? ""))) {
            return NextResponse.json({ error: "El CUIL ingresado no es válido. Verificá el número e intentá de nuevo." }, { status: 400 });
        }

        const errorDomicilio =
            errorDomicilioIncompleto(updateData, datoActual, "Legal") ??
            errorDomicilioIncompleto(updateData, datoActual, "Real");
        if (errorDomicilio) {
            return NextResponse.json({ error: errorDomicilio }, { status: 400 });
        }

        const updated = await prisma.dato.updateMany({
            where: { expediente: session.expediente },
            data: updateData
        });

        if (updated.count === 0) {
            return NextResponse.json({ error: "No se encontró el registro para actualizar" }, { status: 404 });
        }

        // Calcular campos modificados
        const cambios: Record<string, { anterior: string; nuevo: string; label: string }> = {};
        for (const [key, newVal] of Object.entries(updateData)) {
            const oldVal = (datoActual as Record<string, unknown>)?.[key];
            if (String(oldVal ?? "") !== String(newVal ?? "")) {
                cambios[key] = {
                    anterior: String(oldVal ?? ""),
                    nuevo: String(newVal ?? ""),
                    label: fieldLabels[key] ?? key,
                };
            }
        }

        // Tracking de cambios (no bloquea si falla)
        try {
            if (Object.keys(cambios).length > 0) {
                await prisma.cambioDatos.create({
                    data: { expediente: session.expediente || "", campos: cambios }
                });

                const [admins, user] = await Promise.all([
                    prisma.user.findMany({
                        where: { accessLevel: { in: ["admin", "superadmin"] } },
                        select: { expediente: true },
                    }),
                    prisma.user.findUnique({
                        where: { expediente: session.expediente },
                        select: { nombre: true, apellido: true },
                    }),
                ]);

                if (admins.length > 0) {
                    const nombre = user ? `${user.apellido}, ${user.nombre}` : `Mat. ${session.expediente}`;
                    await prisma.notificacion.createMany({
                        data: admins.filter(a => a.expediente).map((a) => ({
                            expediente: a.expediente!,
                            titulo: "Modificación de Datos",
                            mensaje: `${nombre} (Mat. ${session.expediente}) actualizó sus datos personales.`,
                            tipo: "admin_cambios",
                        })),
                    });
                }
            }
        } catch (trackingError) {
            console.error("Error al registrar cambios (no crítico):", trackingError);
        }

        return NextResponse.json({ message: "Datos actualizados correctamente" });
    } catch (error) {
        console.error("Error al actualizar datos:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
