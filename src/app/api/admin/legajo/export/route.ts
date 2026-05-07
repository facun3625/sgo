import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";

const COL_LABELS: Record<string, string> = {
    expediente: "Expediente",
    apellido: "Apellido",
    nombre: "Nombre",
    documento: "DNI",
    cuil: "CUIL",
    emailLegal: "Email Legal",
    emailReal: "Email Real",
    telefonosLegal: "Teléfono Legal",
    movilLegal: "Móvil Legal",
    telefonosReal: "Teléfono Real",
    movilReal: "Móvil Real",
    domicilioLegal: "Domicilio Legal",
    postalLegal: "CP Legal",
    localidadLegal: "Localidad Legal",
    domicilioReal: "Domicilio Real",
    postalReal: "CP Real",
    localidadReal: "Localidad Real",
    folio: "Folio",
    tomo: "Tomo",
    tipo: "Tipo",
    fechaMatriculacion: "Fecha Matriculación",
    status: "Estado",
};

const STATUS_LABELS: Record<string, string> = {
    active: "Activo",
    suspended: "Suspendido",
    cancelled: "Cancelado",
};

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || !["admin", "superadmin"].includes(session.accessLevel)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.trim() ?? "";
    const colsParam = sp.get("cols") ?? "";
    const extraCols = colsParam
        ? colsParam.split(",").filter((c) => c in COL_LABELS)
        : [];
    const allCols = ["expediente", "apellido", "nombre", ...extraCols];

    const where = search
        ? {
              OR: [
                  { expediente: { contains: search, mode: "insensitive" as const } },
                  { apellido: { contains: search, mode: "insensitive" as const } },
                  { nombre: { contains: search, mode: "insensitive" as const } },
              ],
          }
        : {};

    const datos = await prisma.dato.findMany({
        where,
        orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    });

    let userMap = new Map<string, string>();
    if (extraCols.includes("status")) {
        const expedientes = datos.map((d) => d.expediente).filter(Boolean) as string[];
        if (expedientes.length > 0) {
            const users = await prisma.user.findMany({
                where: { expediente: { in: expedientes } },
                select: { expediente: true, status: true },
            });
            userMap = new Map(users.map((u) => [u.expediente ?? "", u.status]));
        }
    }

    const headers = allCols.map((c) => COL_LABELS[c] ?? c);

    const sheetData = [
        headers,
        ...datos.map((d) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r = d as any;
            const row: Record<string, string> = {
                expediente: r.expediente ?? "",
                apellido: r.apellido ?? "",
                nombre: r.nombre ?? "",
                documento: r.documento ?? "",
                cuil: r.cuil ?? "",
                emailLegal: r.emailLegal ?? "",
                emailReal: r.emailReal ?? "",
                telefonosLegal: r.telefonosLegal ?? "",
                movilLegal: r.movilLegal ?? "",
                telefonosReal: r.telefonosReal ?? "",
                movilReal: r.movilReal ?? "",
                domicilioLegal: r.domicilioLegal ?? "",
                postalLegal: r.postalLegal ?? "",
                localidadLegal: r.localidadLegal ?? "",
                domicilioReal: r.domicilioReal ?? "",
                postalReal: r.postalReal ?? "",
                localidadReal: r.localidadReal ?? "",
                folio: r.folio ?? "",
                tomo: r.tomo ?? "",
                tipo: r.tipo ?? "",
                fechaMatriculacion: r.fechaMatriculacion
                    ? new Date(r.fechaMatriculacion).toISOString().slice(0, 10)
                    : "",
                status: r.expediente
                    ? STATUS_LABELS[userMap.get(r.expediente) ?? ""] ?? ""
                    : "",
            };
            return allCols.map((c) => row[c] ?? "");
        }),
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Auto column width
    const colWidths = headers.map((h, i) => {
        const max = Math.max(
            h.length,
            ...sheetData.slice(1).map((row) => String((row as string[])[i] ?? "").length)
        );
        return { wch: Math.min(max + 2, 40) };
    });
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Legajo");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(buf, {
        headers: {
            "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="legajo_${date}.xlsx"`,
        },
    });
}
