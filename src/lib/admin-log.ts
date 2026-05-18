import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export interface LogParams {
    adminId: number;
    adminNombre: string;
    expediente?: string | null;
    modulo: string;
    accion: string;
    detalle?: Record<string, unknown>;
    req?: NextRequest;
}

export async function logAdmin(params: LogParams) {
    try {
        const ip = params.req
            ? (params.req.headers.get("x-forwarded-for")?.split(",")[0] ?? params.req.headers.get("x-real-ip") ?? null)
            : null;
        await prisma.adminLog.create({
            data: {
                adminId: params.adminId,
                adminNombre: params.adminNombre,
                expediente: params.expediente ?? null,
                modulo: params.modulo,
                accion: params.accion,
                detalle: params.detalle ?? undefined,
                ip,
            },
        });
    } catch {
        // No bloquear la operación principal si falla el log
    }
}
