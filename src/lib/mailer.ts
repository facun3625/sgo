import nodemailer from "nodemailer";

const SMTP = {
    host: "vps-1445550-x.dattaweb.com",
    port: 465 as const,
    secure: true,
    auth: { user: "cpasf@sgo-casf.online", pass: "rN00r/H0aL" },
};

const transporter = nodemailer.createTransport(SMTP);

// Pool transport para envíos masivos — 10 correos/seg, 3 conexiones simultáneas
const poolTransporter = nodemailer.createTransport({
    ...SMTP,
    pool: true,
    maxConnections: 3,
    rateLimit: 10,
    rateDelta: 1000,
});

const FROM = '"CPASF · SGO" <cpasf@sgo-casf.online>';
const YEAR = new Date().getFullYear();

function baseLayout(content: string) {
    return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
            <p style="font-size:12px;font-weight:700;letter-spacing:0.1em;color:#64748b;text-transform:uppercase;margin:0">CPASF · Sistema de Gestión</p>
        </div>
        <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
            ${content}
        </div>
        <p style="text-align:center;color:#cbd5e1;font-size:11px;margin-top:20px;">© ${YEAR} CPASF · 1ª Circunscripción</p>
    </div>`;
}

export async function enviarTokenRecuperacion(destinatario: string, token: string) {
    await transporter.sendMail({
        from: FROM,
        to: destinatario,
        subject: "Código de recuperación de contraseña",
        html: baseLayout(`
            <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 8px">Recuperación de contraseña</h2>
            <p style="color:#64748b;font-size:14px;margin:0 0 28px">Usá el siguiente código para restablecer tu contraseña. <strong>Expira en 30 minutos.</strong></p>
            <div style="background:#063f68;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                <p style="font-size:40px;font-weight:900;letter-spacing:0.25em;color:#fff;margin:0">${token}</p>
            </div>
            <p style="color:#94a3b8;font-size:12px;margin:0">Si no solicitaste este código, ignorá este mensaje. Tu contraseña no fue modificada.</p>
        `),
    });
}

export async function enviarNotificacionMensaje(destinatario: string) {
    await transporter.sendMail({
        from: FROM,
        to: destinatario,
        subject: "Nuevo mensaje en el portal SGO",
        html: baseLayout(`
            <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 12px">Nuevo mensaje</h2>
            <p style="color:#475569;font-size:15px;margin:0 0 28px">Tenés un nuevo mensaje de SGO en el portal. Ingresá para verlo.</p>
            <div style="text-align:center;">
                <a href="https://sgo-casf.online/dashboard/mensajes" style="display:inline-block;background:#063f68;color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;">Ir al portal</a>
            </div>
        `),
    });
}

export async function enviarComunicadoMasivo(destinatarios: string[], asunto: string) {
    const html = baseLayout(`
        <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 12px">Nuevo comunicado</h2>
        <p style="color:#475569;font-size:15px;margin:0 0 8px">Se te envió un nuevo comunicado:</p>
        <p style="font-weight:700;color:#063f68;font-size:15px;margin:0 0 28px">${asunto}</p>
        <p style="color:#64748b;font-size:14px;margin:0 0 28px">Ingresá al portal SGO para leerlo.</p>
        <div style="text-align:center;">
            <a href="https://sgo-casf.online/dashboard/comunicados" style="display:inline-block;background:#063f68;color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;">Ir al portal</a>
        </div>
    `);

    for (const email of destinatarios) {
        poolTransporter.sendMail({ from: FROM, to: email, subject: `Comunicado: ${asunto}`, html }).catch(() => {});
    }
}
