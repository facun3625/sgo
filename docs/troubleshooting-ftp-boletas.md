# FTP de boletas: "Permission denied" al subir PDFs

## Síntoma

El cliente FTP/SFTP (FileZilla, WinSCP, etc.) tira error al subir un archivo a
`/boletas/mensual/`, `/boletas/anual/` o `/boletas/deuda/`:

```
Error: /boletas/mensual/archivo.pdf: open for write: permission denied
```

El listado de la carpeta funciona bien, solo falla la escritura.

## Causa

El acceso es **SFTP sobre SSH** (usuario del sistema `boletas`, uid 1000, con
`ChrootDirectory` + `internal-sftp` en `sshd_config` — se ve como procesos
`sshd: boletas@internal-sftp` en `ps aux`). El chroot mapea:

```
/root/sgo/public/uploads/            →  /            (raíz del usuario boletas)
/root/sgo/public/uploads/boletas/    →  /boletas/
```

Las carpetas `mensual`, `anual` y `deuda` deben ser dueño `boletas:boletas`
para que el usuario pueda escribir ahí.

**El bug real:** el botón "Borrar lote" de `/admin/boletas` (endpoint
`DELETE /api/admin/boletas`) hacía `rm -rf` de toda la carpeta del tipo
correspondiente y la volvía a crear con `mkdir`. Como la app corre como
`root` en el VPS (se deployea desde `/root/sgo`), esa recreación dejaba la
carpeta con dueño `root`, pisando el `chown boletas:boletas` y rompiendo el
acceso FTP — **solo para el tipo que se acababa de "vaciar"** (por eso a
veces andaba `anual`/`deuda` y fallaba `mensual`, o viceversa).

Esto ya se corrigió en el código: [`src/app/api/admin/boletas/route.ts`](../src/app/api/admin/boletas/route.ts)
ahora borra solo los *archivos de adentro* de la carpeta, sin tocar ni
recrear la carpeta en sí — así nunca más se pisa el dueño. Si el problema
vuelve a aparecer, algo más está recreando esas carpetas (revisar también
`api/admin/boletas/upload/route.ts`, que solo debería leer el directorio,
no recrearlo).

## Diagnóstico rápido (por SSH al VPS, como root)

```bash
# 1. Ver dueño y permisos
ls -la /root/sgo/public/uploads/boletas/
ls -la /root/sgo/public/uploads/boletas/mensual/

# 2. Confirmar el usuario FTP y su uid/gid
id boletas

# 3. Descartar filesystem read-only o atributo inmutable
mount | grep " / "
lsattr -d /root/sgo/public/uploads/boletas/mensual

# 4. Confirmar que es SFTP interno (no vsftpd/pure-ftpd)
ps aux | grep -i ftp
```

Si `anual`/`deuda` están `boletas:boletas` pero `mensual` (o el tipo que
falla) aparece como `root:root`, ese es el problema.

## Fix manual (mientras se deployea el fix de código, o si vuelve a pasar)

```bash
chown -R boletas:boletas /root/sgo/public/uploads/boletas/<tipo>
chmod -R 755 /root/sgo/public/uploads/boletas/<tipo>
```

Reemplazar `<tipo>` por `mensual`, `anual` o `deuda` según corresponda.

No hace falta reiniciar `pm2` ni la sesión SFTP — el chown aplica al toque.

## Descartado en esta investigación

- **SELinux**: no aplica, el VPS es Debian/Ubuntu (`getenforce` no existe).
- **Filesystem read-only o atributo inmutable (`chattr +i`)**: descartado,
  disco monta `rw` y `lsattr` no muestra flag `i`.
- **Demonio FTP tradicional (vsftpd/pure-ftpd)**: no está en uso, es
  `internal-sftp` de OpenSSH — por eso `/var/log/vsftpd.log` y
  `journalctl -u vsftpd` no tienen nada.
