import nodemailer from "nodemailer";
import { Resend } from "resend";
import prisma from "@/lib/prisma";

// Resend para mails transaccionales (recuperación, notificaciones, etc.): no dependen
// del cupo horario del SMTP masivo. Se activa solo si hay RESEND_API_KEY configurada;
// si no, todo cae al SMTP de siempre.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM ?? "CPASF · SGO <noreply@sgo-casf.online>";
const resendClient = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const FALLBACK_SMTP = {
    host: "vps-1445550-x.dattaweb.com",
    port: 465 as const,
    secure: true,
    auth: { user: "cpasf@sgo-casf.online", pass: "rN00r/H0aL" },
};

const FALLBACK_FROM = '"CPASF · SGO" <cpasf@sgo-casf.online>';

async function getSmtpConfig() {
    try {
        const configs = await prisma.config.findMany({
            where: { clave: { in: ["smtpHost", "smtpPort", "smtpUser", "smtpPass", "smtpFrom"] } },
        });
        const map = Object.fromEntries(configs.map(c => [c.clave, c.valor]));
        if (map.smtpHost && map.smtpUser && map.smtpPass) {
            return {
                smtp: {
                    host: map.smtpHost,
                    port: parseInt(map.smtpPort ?? "465") as 465,
                    secure: parseInt(map.smtpPort ?? "465") === 465,
                    auth: { user: map.smtpUser, pass: map.smtpPass },
                },
                from: map.smtpFrom || FALLBACK_FROM,
            };
        }
    } catch {}
    return { smtp: FALLBACK_SMTP, from: FALLBACK_FROM };
}

const YEAR = new Date().getFullYear();
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://sgo-casf.online";
const LOGO_URL = `${BASE_URL}/sgo_nuevo.png`;

// Timeouts cortos: si el SMTP no responde (ej: saturado por el límite horario),
// que falle rápido en vez de dejar el request colgado varios minutos.
const MAIL_TIMEOUTS = { connectionTimeout: 20000, greetingTimeout: 15000, socketTimeout: 30000 };

type Adjunto = { filename: string; content: Buffer; contentType?: string };

// Envía un mail transaccional (crítico, bajo volumen). Prioriza Resend; si no está
// configurado o falla, cae al SMTP tradicional.
async function enviarTransaccional(opts: { to: string; subject: string; html: string; attachments?: Adjunto[] }) {
    if (resendClient) {
        try {
            const res = await resendClient.emails.send({
                from: RESEND_FROM,
                to: [opts.to],
                subject: opts.subject,
                html: opts.html,
                attachments: opts.attachments?.map(a => ({ filename: a.filename, content: a.content })),
            });
            if (!res.error) return;
            console.error("[mailer] Resend devolvió error, uso SMTP de respaldo:", res.error);
        } catch (err) {
            console.error("[mailer] Resend falló, uso SMTP de respaldo:", err);
        }
    }
    const { smtp, from } = await getSmtpConfig();
    const transporter = nodemailer.createTransport({ ...smtp, ...MAIL_TIMEOUTS });
    await transporter.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html, attachments: opts.attachments });
}

function baseLayout(content: string) {
    return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
            <img src="${LOGO_URL}" alt="SGO" width="40" height="40" style="display:block;margin:0 auto 8px;border-radius:8px;" />
            <p style="font-size:12px;font-weight:700;letter-spacing:0.1em;color:#64748b;text-transform:uppercase;margin:0">CPASF · SGO</p>
        </div>
        <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
            ${content}
        </div>
        <p style="text-align:center;color:#cbd5e1;font-size:11px;margin-top:20px;">© ${YEAR} CPASF · 1ª Circunscripción</p>
    </div>`;
}

// Cabecera con marca institucional (azul + logo), usada en Email Marketing
function marketingLayout(content: string) {
    return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden;">
        <div style="background:#063f68;padding:32px 24px;text-align:center;">
            <img src="${LOGO_URL}" alt="CPASF" width="56" height="56" style="display:block;margin:0 auto 12px;border-radius:12px;" />
            <p style="font-size:15px;font-weight:800;color:#fff;margin:0">Colegio de Profesionales de la Abogacía</p>
            <p style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:#93c5fd;text-transform:uppercase;margin:4px 0 0">Santa Fe · 1ª Circunscripción</p>
        </div>
        <div style="padding:24px;">
            <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
                ${content}
            </div>
            <p style="text-align:center;color:#cbd5e1;font-size:11px;margin-top:20px;">© ${YEAR} CPASF · 1ª Circunscripción</p>
        </div>
    </div>`;
}

export async function enviarTokenRecuperacion(destinatario: string, token: string) {
    await enviarTransaccional({
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
    await enviarTransaccional({
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

export async function enviarInscripcionCursoConfirmada(destinatario: string, nombreCurso: string) {
    await enviarTransaccional({
        to: destinatario,
        subject: `Inscripción confirmada — ${nombreCurso}`,
        html: baseLayout(`
            <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 12px">¡Inscripción confirmada!</h2>
            <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 12px">Tu inscripción al curso <strong>${nombreCurso}</strong> quedó confirmada.</p>
            <p style="color:#64748b;font-size:13px;margin:0">El día del curso, el organizador va a registrar tu asistencia con tu nombre y DNI — no necesitás presentar nada más.</p>
        `),
    });
}

export async function enviarCertificadoCursoInvitado(destinatario: string, nombreCurso: string, pdfBuffer: Buffer) {
    await enviarTransaccional({
        to: destinatario,
        subject: `Tu certificado — ${nombreCurso}`,
        html: baseLayout(`
            <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 12px">Certificado disponible</h2>
            <p style="color:#475569;font-size:15px;line-height:1.6;margin:0">Adjuntamos tu certificado de participación del curso <strong>${nombreCurso}</strong>.</p>
        `),
        attachments: [{
            filename: `certificado-${nombreCurso.replace(/\s+/g, "-").toLowerCase()}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
        }],
    });
}

const MAIL_CHUNK = 20;
const MAIL_DELAY_MS = 5000;

export async function enviarComunicadoMasivo(destinatarios: string[], asunto: string, cuerpo?: string, btnUrl?: string, btnTexto?: string) {
    const { smtp, from } = await getSmtpConfig();
    const transporter = nodemailer.createTransport({ ...smtp, ...MAIL_TIMEOUTS });

    const cuerpoHtml = cuerpo
        ? cuerpo.replace(/\n/g, "<br>")
        : "Ingresá al portal SGO para leer el comunicado.";

    const url = btnUrl || "https://app.sgo-casf.online/";
    const texto = btnTexto || "Ir al portal";

    const html = baseLayout(`
        <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 12px">${asunto}</h2>
        <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 28px">${cuerpoHtml}</p>
        <div style="text-align:center;">
            <a href="${url}" style="display:inline-block;background:#063f68;color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;">${texto}</a>
        </div>
    `);

    (async () => {
        for (let i = 0; i < destinatarios.length; i += MAIL_CHUNK) {
            const lote = destinatarios.slice(i, i + MAIL_CHUNK);
            const results = await Promise.allSettled(
                lote.map(email => transporter.sendMail({ from, to: email, subject: asunto, html }))
            );
            results.forEach((r, idx) => {
                if (r.status === "rejected") console.error(`[mailer] Error enviando a ${lote[idx]}:`, r.reason);
            });
            if (i + MAIL_CHUNK < destinatarios.length) {
                await new Promise(r => setTimeout(r, MAIL_DELAY_MS));
            }
        }
    })().catch(err => console.error("[mailer] Error general:", err));
}

// El proveedor SMTP (dattaweb) corta con "550 Ha alcanzado el limite de 500 por hora"
// cuando se supera la cuota horaria. Es un rechazo temporal, no un mail inválido:
// hay que dejar esos destinatarios en "pendiente" para reintentar en la próxima hora,
// no marcarlos como error.
function esLimiteDeEnvio(err: unknown): boolean {
    const texto = String((err as { response?: string })?.response ?? err ?? "").toLowerCase();
    const codigo = (err as { responseCode?: number })?.responseCode;
    return texto.includes("limite") || texto.includes("limit") || codigo === 450 || codigo === 451 || codigo === 452;
}

export async function enviarEmailMarketing(campanaId: number) {
    const { smtp, from } = await getSmtpConfig();
    const transporter = nodemailer.createTransport({ ...smtp, ...MAIL_TIMEOUTS });

    const campana = await prisma.emailMarketing.findUnique({ where: { id: campanaId } });
    if (!campana || campana.cancelada) return;

    const destinatarios = await prisma.emailMarketingDestinatario.findMany({
        where: { campanaId, estado: "pendiente" },
    });

    const html = marketingLayout(`<div style="color:#1e293b;font-size:15px;line-height:1.6">${campana.contenido}</div>`);

    let detenidoPorLimite = false;

    for (let i = 0; i < destinatarios.length && !detenidoPorLimite; i += MAIL_CHUNK) {
        // Chequear si el admin detuvo la campaña desde el panel (se relee en cada tanda)
        const estado = await prisma.emailMarketing.findUnique({ where: { id: campanaId }, select: { cancelada: true } });
        if (estado?.cancelada) {
            console.warn(`[mailer] Campaña ${campanaId} detenida por el admin.`);
            break;
        }
        const lote = destinatarios.slice(i, i + MAIL_CHUNK);
        await Promise.allSettled(lote.map(async (d) => {
            try {
                await transporter.sendMail({ from, to: d.email, subject: campana.asunto, html });
                await prisma.emailMarketingDestinatario.update({
                    where: { id: d.id },
                    data: { estado: "enviado", enviadoAt: new Date() },
                });
            } catch (err) {
                if (esLimiteDeEnvio(err)) {
                    detenidoPorLimite = true;
                    return; // se deja "pendiente" — la reintenta el auto-resume horario
                }
                await prisma.emailMarketingDestinatario.update({
                    where: { id: d.id },
                    data: { estado: "error", error: String(err) },
                });
            }
        }));
        if (detenidoPorLimite) {
            console.warn(`[mailer] Campaña ${campanaId} pausada: límite horario del proveedor SMTP. Se reintenta automáticamente.`);
            break;
        }
        if (i + MAIL_CHUNK < destinatarios.length) {
            await new Promise(r => setTimeout(r, MAIL_DELAY_MS));
        }
    }
}

// Se llama al arrancar el server (ver src/instrumentation.ts): retoma sola cualquier
// campaña que haya quedado a mitad de camino por un reinicio/deploy anterior.
export async function reanudarCampanasPendientes() {
    const campanas = await prisma.emailMarketing.findMany({
        where: { cancelada: false, destinatarios: { some: { estado: "pendiente" } } },
        select: { id: true },
    });
    for (const c of campanas) {
        enviarEmailMarketing(c.id).catch(err => console.error(`[mailer] Error reanudando campaña ${c.id}:`, err));
    }
}
