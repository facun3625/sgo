import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    const { expediente, token, nuevaPassword } = await req.json();
    if (!expediente || !token || !nuevaPassword)
        return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });

    if (nuevaPassword.length < 6)
        return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });

    const registro = await prisma.recuperacionToken.findFirst({
        where: { expediente: expediente.trim(), token, usado: false },
    });

    if (!registro)
        return NextResponse.json({ error: "Código inválido." }, { status: 400 });

    if (new Date() > registro.expira)
        return NextResponse.json({ error: "El código expiró. Solicitá uno nuevo." }, { status: 400 });

    const hash = await bcrypt.hash(nuevaPassword, 10);

    await prisma.user.updateMany({
        where: { expediente: expediente.trim() },
        data: { password: hash, registered: 1 },
    });

    await prisma.recuperacionToken.update({
        where: { id: registro.id },
        data: { usado: true },
    });

    return NextResponse.json({ ok: true });
}
