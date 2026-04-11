export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { message, history } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });

    const exp = session.expediente;

    const currentPeriod = new Date().toISOString().slice(0, 7);
    const [
        datos, user, deudas, cuotaActual, pagoAnual,
        configMensual, configAnual,
        solicitudes, adhesion, inscripciones, pedidosVentas,
        cursos, eventos, noticias, faqs, tribunalEtica, biblioteca,
    ] = await Promise.all([
        prisma.dato.findFirst({ where: { expediente: exp } }),
        prisma.user.findFirst({ where: { expediente: exp }, select: { nombre: true, apellido: true, status: true } }),
        prisma.deuda.findMany({ where: { expediente: exp } }),
        prisma.cuotaMensual.findFirst({ where: { expediente: exp, periodo: currentPeriod } }),
        prisma.pagoAnual.findFirst({ where: { expediente: exp } }),
        prisma.config.findUnique({ where: { clave: "montoMensual" } }),
        prisma.config.findUnique({ where: { clave: "montoAnual" } }),
        prisma.solicitud.findMany({ where: { expediente: exp }, orderBy: { fecha: "desc" }, take: 10 }),
        prisma.adhesionDebito.findFirst({ where: { expediente: exp }, orderBy: { createdAt: "desc" } }),
        prisma.inscripcionCurso.findMany({ where: { expediente: exp }, include: { curso: true, opcion: true } }),
        prisma.pedido.findMany({ where: { expediente: exp }, orderBy: { createdAt: "desc" }, take: 5, include: { producto: { select: { nombre: true } } } }),
        prisma.curso.findMany({ where: { activo: true, fecha: { gte: new Date() } }, orderBy: { fecha: "asc" }, take: 10, include: { opciones: true } }),
        prisma.evento.findMany({ where: { fecha: { gte: new Date() } }, orderBy: { fecha: "asc" }, take: 10 }),
        prisma.noticia.findMany({ where: { activa: true }, orderBy: { createdAt: "desc" }, take: 5 }),
        prisma.faq.findMany({ include: { categoria: true }, orderBy: { orden: "asc" } }),
        prisma.tribunalEtica.findMany({ where: { expediente: exp } }).catch(() => []),
        prisma.biblioteca.findMany({ where: { activa: true }, orderBy: { destacado: "desc" }, take: 10 }),
    ]);

    const totalDeuda = deudas.reduce((acc, d) => acc + d.monto, 0);
    const solicitudesPendientes = solicitudes.filter(s => s.estado === "pendiente");
    const montoAnual = configAnual ? parseFloat(configAnual.valor) : 48000;
    const montoMensual = configMensual ? parseFloat(configMensual.valor) : 4500;

    const fmt = (d: Date) => new Date(d).toLocaleDateString("es-AR");

    const systemPrompt = `Sos el asistente virtual del Colegio de Abogados de Santa Fe (CASF).
Tu nombre es "Asistente CASF". Respondés en español, de forma amable, clara y concisa.
Solo respondés preguntas relacionadas al colegio, trámites, pagos, cursos, biblioteca y matrícula.
Si te preguntan algo que no tiene que ver con el colegio, redirigí amablemente al tema.

═══ DATOS DEL USUARIO ═══
- Nombre: ${user?.apellido}, ${user?.nombre}
- Matrícula/Expediente: ${exp}
- Estado: ${user?.status === "active" ? "Activa" : user?.status === "suspended" ? "Suspendida" : user?.status === "cancelled" ? "Cancelada" : user?.status}
- Fecha de matriculación: ${datos?.fechaMatriculacion ? fmt(datos.fechaMatriculacion) : "No registrada"}
- Domicilio legal: ${datos?.domicilioLegal || "No registrado"} - ${datos?.localidadLegal || ""}
- Email legal: ${datos?.emailLegal || "No registrado"}
- Email real: ${datos?.emailReal || "No registrado"}
- Teléfono legal: ${datos?.telefonosLegal || datos?.movilLegal || "No registrado"}
- Tomo: ${datos?.tomo || "N/A"} - Folio: ${datos?.folio || "N/A"}
- Documento: ${datos?.documento || "No registrado"}

═══ PAGOS Y DEUDA ═══
- Deuda total: $${totalDeuda.toLocaleString("es-AR")}${totalDeuda > 0 ? " (TIENE DEUDA)" : " (sin deuda)"}
- Monto matrícula anual: $${montoAnual.toLocaleString("es-AR")}
- Monto cuota mensual: $${montoMensual.toLocaleString("es-AR")}
- Pagó matrícula anual este año: ${pagoAnual ? "Sí" : "No"}
- Débito automático: ${adhesion ? `${adhesion.estado} (${adhesion.tipoAdhesion})` : "No tiene"}
- Tarjeta de beneficios: ${totalDeuda > 0 ? "INHABILITADA (tiene deuda pendiente)" : "HABILITADA (sin deuda)"}

═══ SOLICITUDES DE TRÁMITES ═══
${solicitudes.length > 0
    ? solicitudes.map(s => `- ${s.tipo} | Estado: ${s.estado} | Fecha: ${fmt(s.fecha)}`).join("\n")
    : "- Sin solicitudes"}
Pendientes: ${solicitudesPendientes.length > 0 ? solicitudesPendientes.map(s => s.tipo).join(", ") : "Ninguna"}

═══ CURSOS INSCRIPTO ═══
${inscripciones.length > 0
    ? inscripciones.map(i => `- ${i.curso.titulo} (${fmt(i.curso.fecha)}) | Opción: ${i.opcion?.nombre || "N/A"} | Estado: ${i.estado}`).join("\n")
    : "- No está inscripto en ningún curso"}

═══ VENTAS / PEDIDOS ═══
${pedidosVentas.length > 0
    ? pedidosVentas.map(t => `- ${t.producto.nombre} x${t.cantidad} | ${t.metodoPago} | Estado: ${t.estado} | Fecha: ${fmt(t.createdAt)}`).join("\n")
    : "- Sin pedidos"}

═══ TRIBUNAL DE ÉTICA ═══
${(tribunalEtica as any[]).length > 0
    ? (tribunalEtica as any[]).map((t: any) => `- ${t.texto} (desde ${fmt(t.inicio)} hasta ${fmt(t.fin)})`).join("\n")
    : "- Sin observaciones"}

═══ CURSOS PRÓXIMOS DEL COLEGIO ═══
${cursos.length > 0
    ? cursos.map(c => `- ${c.titulo} | ${fmt(c.fecha)}${c.fechaFin ? ` al ${fmt(c.fechaFin)}` : ""} | ${c.modalidad} | ${c.lugar || "Sin lugar"} | Opciones: ${c.opciones.map(o => `${o.nombre} $${o.precio}`).join(", ")}`).join("\n")
    : "- No hay cursos próximos"}

═══ EVENTOS PRÓXIMOS ═══
${eventos.length > 0
    ? eventos.map(e => `- ${e.titulo} | ${fmt(e.fecha)} | ${e.tipo}`).join("\n")
    : "- No hay eventos próximos"}

═══ NOTICIAS RECIENTES ═══
${noticias.length > 0
    ? noticias.map(n => `- ${n.titulo}`).join("\n")
    : "- Sin noticias"}

═══ BIBLIOTECA ═══
${biblioteca.length > 0
    ? biblioteca.map(b => `- ${b.titulo} (${b.autor}) | ${b.tipo} | Categoría: ${b.categoria}`).join("\n")
    : "- Sin material disponible"}

═══ PREGUNTAS FRECUENTES ═══
${faqs.length > 0
    ? faqs.map(f => `[${f.categoria.nombre}] P: ${f.pregunta} R: ${f.respuesta}`).join("\n")
    : "- Sin FAQs cargadas"}

═══ TRÁMITES DISPONIBLES ═══
1. Certificado de matrícula - Válido 60 días. Menú: Solicitudes > Certificado de Matrícula.
2. Clave SISFE - Para expedientes judiciales. Menú: Solicitudes > SISFE.
3. Usuario CATASTRO/SIGIT - Sistema catastral. Menú: Solicitudes > CATASTRO.
4. Jurisprudencia - Solicitar documentos. Menú: Solicitudes > Jurisprudencia.
5. Suspensión/Cancelación de matrícula - Menú: Solicitudes > Suspensión.
6. Adhesión a Débito Automático - Menú: Adhesión a débito automático.

═══ NAVEGACIÓN DEL SISTEMA ═══
- Pagos: menú "Estado de matrícula y Pagos"
- Credencial digital: menú "Credencial digital"
- Datos personales: menú "Mis datos"
- Solicitudes enviadas: menú "Solicitudes enviadas"
- Cursos: menú "Cursos"
- Biblioteca: menú "Biblioteca"
- Tokens: menú "Tokens"
- Mensajes con el colegio: ícono de sobre en la barra superior

Respondé de forma directa y útil. Usá la información del usuario para personalizar cada respuesta.`;

    try {
        const messages: Groq.Chat.ChatCompletionMessageParam[] = [
            { role: "system", content: systemPrompt },
            ...(history || [])
                .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
                .map((m: { role: string; text: string }) => ({
                    role: m.role as "user" | "assistant",
                    content: m.text,
                })),
            { role: "user", content: message },
        ];

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages,
            max_tokens: 1024,
        });

        const text = completion.choices[0]?.message?.content || "No pude generar una respuesta.";
        return NextResponse.json({ response: text });
    } catch (error: any) {
        console.error("Groq error:", error?.message || error);
        return NextResponse.json({ error: "Error al procesar tu consulta" }, { status: 500 });
    }
}
