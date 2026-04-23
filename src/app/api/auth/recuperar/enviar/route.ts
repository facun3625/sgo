import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { enviarTokenRecuperacion } from "@/lib/mailer";

export async function POST(req: NextRequest) {
    try {
        const { expediente, tipo } = await req.json();
        if (!expediente || !tipo)
            return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });

        const dato = await prisma.dato.findFirst({
            where: { expediente: expediente.trim() },
            select: { emailLegal: true, emailReal: true },
        });

        if (!dato)
            return NextResponse.json({ error: "Profesional no encontrado." }, { status: 404 });

        const email = tipo === "real" ? dato.emailReal : dato.emailLegal;
        if (!email?.trim())
            return NextResponse.json({ error: "Correo no disponible." }, { status: 400 });

        await prisma.recuperacionToken.updateMany({
            where: { expediente: expediente.trim(), usado: false },
            data: { usado: true },
        });

        const token = String(Math.floor(100000 + Math.random() * 900000));
        const expira = new Date(Date.now() + 30 * 60 * 1000);

        await prisma.recuperacionToken.create({
            data: { expediente: expediente.trim(), token, expira },
        });

        await enviarTokenRecuperacion(email.trim(), token);

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("Error en /api/auth/recuperar/enviar:", err);
        return NextResponse.json({ error: "No se pudo enviar el correo. Intentá de nuevo." }, { status: 500 });
    }
}
