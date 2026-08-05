// Corre una vez cuando arranca el servidor (ej: después de "pm2 restart").
// Se usa para retomar solas las campañas de Email Marketing que hayan quedado
// a mitad de camino por un reinicio/deploy mientras estaban enviando.
export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;
    const { reanudarCampanasPendientes } = await import("@/lib/mailer");
    reanudarCampanasPendientes().catch(err =>
        console.error("[startup] Error reanudando campañas de email marketing:", err)
    );
}
