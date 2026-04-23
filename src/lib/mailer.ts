import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: "vps-1445550-x.dattaweb.com",
    port: 465,
    secure: true,
    auth: {
        user: "cpasf@sgo-casf.online",
        pass: "rN00r/H0aL",
    },
});

export async function enviarTokenRecuperacion(destinatario: string, token: string) {
    await transporter.sendMail({
        from: '"CPASF · SGO" <cpasf@sgo-casf.online>',
        to: destinatario,
        subject: "Código de recuperación de contraseña",
        html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
            <div style="text-align:center;margin-bottom:24px;">
                <p style="font-size:12px;font-weight:700;letter-spacing:0.1em;color:#64748b;text-transform:uppercase;margin:0">CPASF · Sistema de Gestión</p>
            </div>
            <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
                <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 8px">Recuperación de contraseña</h2>
                <p style="color:#64748b;font-size:14px;margin:0 0 28px">Usá el siguiente código para restablecer tu contraseña. <strong>Expira en 30 minutos.</strong></p>
                <div style="background:#063f68;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                    <p style="font-size:40px;font-weight:900;letter-spacing:0.25em;color:#fff;margin:0">${token}</p>
                </div>
                <p style="color:#94a3b8;font-size:12px;margin:0">Si no solicitaste este código, ignorá este mensaje. Tu contraseña no fue modificada.</p>
            </div>
            <p style="text-align:center;color:#cbd5e1;font-size:11px;margin-top:20px;">© ${new Date().getFullYear()} CPASF · 1ª Circunscripción</p>
        </div>
        `,
    });
}
