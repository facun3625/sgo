// Corre al arrancar el servidor (ej: después de "pm2 restart"), y de ahí en más
// una vez por hora. Se usa para retomar solas las campañas de Email Marketing que
// hayan quedado con destinatarios pendientes — ya sea por un reinicio/deploy a
// mitad de camino, o porque el proveedor SMTP corta el envío al llegar a su
// límite de 500 mails por hora (se resetea cada hora, por eso el intervalo).
export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;
    const { reanudarCampanasPendientes } = await import("@/lib/mailer");
    const tick = () =>
        reanudarCampanasPendientes().catch(err =>
            console.error("[startup] Error reanudando campañas de email marketing:", err)
        );
    tick();
    setInterval(tick, 60 * 60 * 1000);
}
