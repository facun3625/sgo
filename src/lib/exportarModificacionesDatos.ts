import fs from "fs/promises";
import path from "path";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import { notificarAdmins } from "@/lib/notificaciones";
import { formatearCuit, esCuitValido } from "@/lib/cuit";

// Carpeta que expone el mismo usuario SFTP "boletas" (chroot en
// public/uploads/, ver docs/troubleshooting-ftp-boletas.md) — acá el sistema
// externo (Tango) viene a buscar el Excel, no hace falta tocar sshd_config
// ni chown: alcanza con que la carpeta y los archivos sean legibles por
// "otros", igual que necesita nginx para servir uploads/.
const DIR = path.join(process.cwd(), "public/uploads/exportar/modificaciones-datos");

// Orden y texto exacto de columnas pedido por Tango — incluye los typos
// tal cual vienen en su propia plantilla ("Código posta legall", "INSCRIPCION"
// sin tilde). No "corregir": el sistema que lo recibe matchea por texto literal.
const COLUMNAS = [
    "EXPEDIENTE", "Código", "Razón social", "Nro. de documento", "TOMO", "FOLIO",
    "Domicilio", "Código postal", "Localidad", "Teléfono 1", "Correo electrónico",
    "Domicilio comercial", "Teléfono 2", "INSCRIPCION", "CUIT CATASTRO", "ESTADO",
    "Dirección legal", "Localidad legal", "Código posta legall", "Teléfono 1 legal",
] as const;

type Fila = Record<(typeof COLUMNAS)[number], string>;

type CamposAcumulados = Record<string, { anterior: string; nuevo: string; label: string }>;

function filaVacia(): Fila {
    return Object.fromEntries(COLUMNAS.map(c => [c, ""])) as Fila;
}

// Arma la fila de salida a partir de los campos acumulados (último valor por
// clave, ver acumularPendientes) y los datos de identificación del expediente.
// Reglas acordadas con el Colegio (no inferidas del Excel de ejemplo):
//   - Email: si cambiaron real y legal y quedaron distintos, gana el legal.
//   - Domicilio/Teléfono legal se duplican en sus dos columnas de destino,
//     porque así está nombrado en la plantilla de Tango.
//   - Celular (real/legal) y provincia real no tienen columna destino: no se
//     exportan.
function construirFila(expediente: string, cod: string, apellido: string, nombre: string, campos: CamposAcumulados): Fila {
    const fila = filaVacia();
    fila.EXPEDIENTE = expediente;
    fila.Código = cod;
    fila["Razón social"] = `${apellido}, ${nombre}`;

    const valor = (clave: string) => campos[clave]?.nuevo ?? "";

    if (campos.cuil) {
        const cuil = valor("cuil");
        // Un CUIL inválido (ya sea por los datos originales o un bug previo
        // de formato) se manda vacío en vez de con basura — mejor que Tango
        // no reciba nada a que reciba un dato que no cierra el dígito
        // verificador.
        fila["CUIT CATASTRO"] = esCuitValido(cuil) ? formatearCuit(cuil) : "";
    }
    if (campos.domicilioReal) fila.Domicilio = valor("domicilioReal");
    if (campos.postalReal) fila["Código postal"] = valor("postalReal");
    if (campos.localidadReal) fila.Localidad = valor("localidadReal");
    if (campos.telefonosReal) fila["Teléfono 1"] = valor("telefonosReal");

    const email = campos.emailLegal ? valor("emailLegal") : campos.emailReal ? valor("emailReal") : "";
    if (email) fila["Correo electrónico"] = email;

    if (campos.domicilioLegal) {
        fila["Domicilio comercial"] = valor("domicilioLegal");
        fila["Dirección legal"] = valor("domicilioLegal");
    }
    if (campos.postalLegal) fila["Código posta legall"] = valor("postalLegal");
    if (campos.localidadLegal) fila["Localidad legal"] = valor("localidadLegal");
    if (campos.telefonosLegal) {
        fila["Teléfono 2"] = valor("telefonosLegal");
        fila["Teléfono 1 legal"] = valor("telefonosLegal");
    }

    return fila;
}

function nombreArchivo(fecha: Date): string {
    const p = (n: number) => String(n).padStart(2, "0");
    const f = `${fecha.getFullYear()}${p(fecha.getMonth() + 1)}${p(fecha.getDate())}`;
    const h = `${p(fecha.getHours())}${p(fecha.getMinutes())}${p(fecha.getSeconds())}`;
    return `Actualizacion_cliente_SGO_${f}_${h}.xlsx`;
}

export type ResultadoExportacion =
    | { generado: true; archivo: string; filas: number }
    | { generado: false; motivo: "sin_cambios" };

// Junta todos los CambioDatos pendientes (exportado: false) por expediente.
// Si la misma persona tiene varios guardados pendientes, se acumulan en una
// sola fila — el valor final de cada campo es el de su guardado más reciente.
async function acumularPendientes() {
    const pendientes = await prisma.cambioDatos.findMany({
        where: { exportado: false },
        orderBy: { createdAt: "asc" },
    });

    const porExpediente = new Map<string, { ids: number[]; campos: CamposAcumulados }>();
    for (const p of pendientes) {
        const actual = porExpediente.get(p.expediente) ?? { ids: [], campos: {} };
        actual.ids.push(p.id);
        Object.assign(actual.campos, p.campos as CamposAcumulados);
        porExpediente.set(p.expediente, actual);
    }
    return porExpediente;
}

export async function generarExportacionModificaciones(): Promise<ResultadoExportacion> {
    const porExpediente = await acumularPendientes();
    if (porExpediente.size === 0) return { generado: false, motivo: "sin_cambios" };

    const expedientes = [...porExpediente.keys()];
    const datos = await prisma.dato.findMany({ where: { expediente: { in: expedientes } } });
    const datoMap = new Map(datos.filter(d => d.expediente).map(d => [d.expediente as string, d]));

    const filas: Fila[] = [];
    const todosLosIds: number[] = [];
    for (const [expediente, { ids, campos }] of porExpediente) {
        const dato = datoMap.get(expediente);
        if (!dato) {
            console.error(`[export-modificaciones] Expediente ${expediente} tiene cambios pendientes pero no se encontró en Dato — se exporta igual con los datos que hay.`);
        }
        filas.push(construirFila(expediente, dato?.cod ?? expediente, dato?.apellido ?? "", dato?.nombre ?? "", campos));
        todosLosIds.push(...ids);
    }

    const ahora = new Date();
    const archivo = nombreArchivo(ahora);
    const rutaCompleta = path.join(DIR, archivo);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filas, { header: [...COLUMNAS] });
    XLSX.utils.book_append_sheet(wb, ws, "Modificaciones");

    await fs.mkdir(DIR, { recursive: true });
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    await fs.writeFile(rutaCompleta, buffer);
    await fs.chmod(DIR, 0o755).catch(() => {});
    await fs.chmod(rutaCompleta, 0o644).catch(() => {});

    await prisma.$transaction([
        prisma.cambioDatos.updateMany({
            where: { id: { in: todosLosIds } },
            data: { exportado: true, exportadoEn: ahora, exportadoArchivo: archivo },
        }),
        prisma.importacionAutomatica.create({
            data: {
                tipo: "export_modificaciones",
                archivo,
                estado: "exitoso",
                filas: filas.length,
                mensaje: `${todosLosIds.length} cambios acumulados en ${filas.length} expedientes.`,
            },
        }),
    ]);

    return { generado: true, archivo, filas: filas.length };
}

const CONFIG_CLAVE_ULTIMA_CORRIDA = "export_modificaciones_ultima_fecha";

// "Hoy", como fecha AR (YYYY-MM-DD) y hora AR, sin importar en qué huso
// horario esté configurado el servidor.
function partesHoyAR(ahora: Date) {
    const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
        weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit",
    });
    const partes = Object.fromEntries(fmt.formatToParts(ahora).map(p => [p.type, p.value]));
    return {
        fecha: `${partes.year}-${partes.month}-${partes.day}`,
        esHabil: !["Sat", "Sun"].includes(partes.weekday),
        minutosDelDia: Number(partes.hour) * 60 + Number(partes.minute),
    };
}

// Se llama cada 5 min desde instrumentation. Corre una sola vez por día
// hábil, dentro de la ventana 7:30–8:00 AR — el margen de 30 min absorbe que
// el tick caiga unos minutos antes/después, o que un reinicio del server
// retrase el primer chequeo del día. Si la corrida tira error no se marca
// como hecha, así se reintenta en el próximo tick dentro de la misma
// ventana; si sigue fallando hasta las 8:00, queda para que un admin la
// reintente a mano desde /admin/cambios-datos (ya se le notificó el error).
export async function chequearExportacionProgramada() {
    const { fecha, esHabil, minutosDelDia } = partesHoyAR(new Date());
    if (!esHabil || minutosDelDia < 7 * 60 + 30 || minutosDelDia >= 8 * 60) return;

    const config = await prisma.config.findUnique({ where: { clave: CONFIG_CLAVE_ULTIMA_CORRIDA } });
    if (config?.valor === fecha) return;

    try {
        const resultado = await generarExportacionModificaciones();
        if (resultado.generado) {
            console.log(`[export-modificaciones] "${resultado.archivo}" generado con ${resultado.filas} filas.`);
        }
    } catch (err) {
        const detalle = err instanceof Error ? err.message : "Error desconocido";
        console.error("[export-modificaciones] Error en la exportación programada:", err);
        await prisma.importacionAutomatica.create({
            data: { tipo: "export_modificaciones", archivo: "-", estado: "error", filas: 0, mensaje: detalle },
        }).catch(() => {});
        await notificarAdmins(
            "Error al exportar modificaciones de datos",
            `No se pudo generar el Excel diario para Tango: ${detalle}. Podés reintentarlo a mano desde Modificaciones de Datos.`,
            "admin_import"
        ).catch(err2 => console.error("[export-modificaciones] No se pudo notificar a los admins:", err2));
        return;
    }

    await prisma.config.upsert({
        where: { clave: CONFIG_CLAVE_ULTIMA_CORRIDA },
        create: { clave: CONFIG_CLAVE_ULTIMA_CORRIDA, valor: fecha },
        update: { valor: fecha },
    }).catch(err => console.error("[export-modificaciones] No se pudo guardar la marca de corrida diaria:", err));
}
