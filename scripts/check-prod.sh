#!/usr/bin/env bash
# Chequeo rápido de salud en producción — correr como root desde /root/sgo:
#   bash scripts/check-prod.sh
# Es de solo lectura: no reinicia nada, no modifica nada.
set -uo pipefail

echo "========================================"
echo " PM2"
echo "========================================"
pm2 jlist 2>/dev/null | node -e '
let data = "";
process.stdin.on("data", d => data += d);
process.stdin.on("end", () => {
    try {
        const procs = JSON.parse(data);
        const sgo = procs.find(p => p.name === "sgo");
        if (!sgo) { console.log("❌ No se encontró un proceso pm2 llamado \"sgo\"."); return; }
        console.log(`Estado: ${sgo.pm2_env.status}`);
        console.log(`Reinicios: ${sgo.pm2_env.restart_time}`);
        console.log(`Uptime desde: ${new Date(sgo.pm2_env.pm_uptime).toLocaleString("es-AR")}`);
        console.log(`Memoria: ${(sgo.monit.memory / 1024 / 1024).toFixed(0)} MB | CPU: ${sgo.monit.cpu}%`);
    } catch { console.log("❌ No se pudo leer el estado de pm2."); }
});
' || echo "❌ pm2 no disponible o sin proceso \"sgo\""

echo
echo "========================================"
echo " Errores recientes en logs (últimas 300 líneas)"
echo "========================================"
ERRORES=$(pm2 logs sgo --lines 300 --nostream 2>/dev/null | grep -i "error" | tail -20)
if [ -z "$ERRORES" ]; then
    echo "✅ Sin errores en las últimas 300 líneas de log."
else
    echo "$ERRORES"
fi

echo
echo "========================================"
echo " Carpeta de FTP (deudas)"
echo "========================================"
DEUDAS_DIR="public/uploads/importar/deudas"
if [ -d "$DEUDAS_DIR" ]; then
    echo "Dueño de $DEUDAS_DIR:"
    ls -ld "$DEUDAS_DIR"
    echo
    echo "Archivos pendientes de procesar (no debería acumularse mucho):"
    find "$DEUDAS_DIR" -maxdepth 1 -type f | sed 's/^/  /' || echo "  (ninguno)"
    for sub in procesando procesados errores; do
        if [ -d "$DEUDAS_DIR/$sub" ]; then
            CANT=$(find "$DEUDAS_DIR/$sub" -maxdepth 1 -type f | wc -l | tr -d ' ')
            echo "  $sub/: $CANT archivo(s)"
        else
            echo "  ⚠ $sub/ todavía no existe (se crea solo la primera vez que corre el watcher)"
        fi
    done
else
    echo "❌ $DEUDAS_DIR no existe — falta el mkdir + chown inicial (ver docs/)"
fi

echo
echo "========================================"
echo " Base de datos"
echo "========================================"
npx tsx scripts/check-prod-db.ts

echo
echo "========================================"
echo " HTTP local"
echo "========================================"
CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null)
if [ "$CODE" = "200" ] || [ "$CODE" = "307" ] || [ "$CODE" = "308" ]; then
    echo "✅ Responde con HTTP $CODE"
else
    echo "❌ Respuesta inesperada: HTTP ${CODE:-sin respuesta}"
fi
