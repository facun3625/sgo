# SGO — Sistema de Gestión CASF

Plataforma para un colegio de abogados. Área pública, dashboard de usuario matriculado y panel de administración.

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- PostgreSQL + Prisma 7 — usar `prisma db push` (sin migrations activas)
- Auth: JWT en cookies HTTP-only (jose + bcryptjs), 24h
- Roles: `superadmin | admin | user`
- Path alias: `@/*` → `./src/*`

## Convenciones
- `getSession()` de `@/lib/auth` → `{ id, expediente, nombre, apellido, accessLevel, permisos }`
- Uploads: `public/uploads/[modulo]/`
- Color primario: `#063f68` · Font: Montserrat · PWA habilitado

## Módulos
- **Usuarios/Matrícula:** perfil, cuotas, deudas, credencial QR, auditoría
- **Pagos:** MercadoPago + transferencia bancaria. `PagoPendiente` centraliza estado. Tipos: matrícula mensual/anual, deudas, cursos, productos
- **Cursos:** CRUD, inscripción con pago, asistencia (ninguna | por_dia | global%), certificados PDF A4 horizontal (jsPDF), QR con html5-qrcode
- **Comunicación:** chat usuario↔admin, envíos masivos, notificaciones, chatbot IA (Groq + Google Generative AI)
- **Contenido:** noticias, biblioteca, FAQ, repositorio, calendario, solicitudes de documentos
- **Ventas:** productos con stock/límite mensual, pedidos MP o transferencia
- **Admin:** permisos granulares, importación masiva, firmas de autoridades, tribunal de ética, config dinámica

## Modelos Prisma clave
`User, Dato, Deuda, CuotaMensual, PagoAnual, PagoPendiente, CambioDatos` · `Curso, CursoOpcion, InscripcionCurso` · `CursoDia, SesionAsistencia, AsistenciaCurso, CertificadoCurso` · `Noticia, Evento, Biblioteca, BibliotecaFavorito, BibliotecaCategoria` · `Faq, FaqCategoria, RepositorioCategoria, RepositorioArchivo` · `Solicitud, AdhesionDebito` · `Producto, Pedido` · `Conversacion, MensajeChat, Notificacion` · `EnvioMasivo, EnvioMasivoDestinatario` · `FirmaAutoridad, Config, TribunalEtica`

## Librerías clave
`mercadopago` · `jspdf` · `html5-qrcode` · `qrcode.react` · `html2canvas` · `groq-sdk` · `@google/generative-ai` · `next-themes` · `lucide-react`
