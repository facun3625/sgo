# Import de Deudas Vencidas — formato nuevo (cuenta corriente)

Documenta el cambio de formato del Excel de "Deudas Vencidas" en Admin → Importar →
Financiero, hecho en agosto 2026, y cómo revertirlo si hiciera falta.

## Qué cambió

**Antes**: el Excel/CSV traía una fila por expediente con el monto total ya calculado
(`expediente,monto`).

**Ahora**: el colegio exporta un reporte de cuenta corriente ("Ventas - Cuenta
Corriente - Deudas vencidas.xlsx") con una fila por **comprobante** (factura)
impago. Un mismo expediente puede tener varias filas — el monto adeudado es la
**suma** de todas sus filas.

Columnas del archivo nuevo:

| Columna | Uso |
|---|---|
| Fecha de vencimiento | Se guarda, se muestra en el detalle |
| Tipo comprobante | No se usa |
| Nro. comprobante | No se usa |
| Cliente | Se extrae el número inicial (`"97 - CRISTINI, MARIA VICTORIA"` → `97`) como `clienteNumero`, por si hace falta cruzar con algo más adelante. No se usa para nada funcional todavía. |
| Importe Pendiente (CTE) | Monto de esa fila — se suma por expediente |
| EXPEDIENTE (Adic.) | Expediente |
| ESTADO (Adic.) | No se usa (siempre viene "ACTIVO") |
| ZONA / SUBZONA (Adic.) | No se usan |

La fila de totales al final del archivo (sin expediente) se descarta automáticamente
porque el filtro exige `expediente` no vacío.

## Cómo funciona el import ahora

`POST /api/admin/importar/financiero` (`src/app/api/admin/importar/financiero/route.ts`),
tipo `"deudas"`:

1. Parsea cada fila con `getExpediente`, `getMonto`, `getFechaVencimiento`,
   `getClienteNumero` (todas con matching flexible de headers, igual que antes).
2. Agrupa por expediente sumando `monto` → arma el array que va a `Deuda`
   (igual que siempre: `expediente` + `monto` total).
3. En una única transacción (`prisma.$transaction`):
   - reemplaza toda la tabla `Deuda` (`deleteMany` + `createMany`) — **sigue siendo
     un reemplazo completo, igual que el comportamiento anterior**, no acumula.
   - reemplaza toda la tabla `DeudaComprobante` con el detalle línea por línea.

`Deuda.monto` sigue siendo lo único que usa el resto del sistema (pagos, PayWay,
MercadoPago, boletas, `/api/user/pagos`) — no hubo que tocar nada de eso.

## Tabla nueva: `DeudaComprobante`

Puramente aditiva (`prisma/schema.prisma`), solo para mostrar de qué se compone la
deuda. No reemplaza ni participa en la lógica de pago.

```prisma
model DeudaComprobante {
  id               Int      @id @default(autoincrement())
  expediente       String
  fechaVencimiento DateTime @map("fecha_vencimiento")
  monto            Float
  clienteNumero    String?  @map("cliente_numero")

  @@index([expediente])
  @@map("deuda_comprobantes")
}
```

## Dónde se ve el detalle

- **Matriculado** (`src/components/dashboard/MatriculaStatus.tsx`): botón "Ver
  detalle" debajo del monto de "Deuda Vencida Detectada" → modal con fecha +
  monto por comprobante. Datos vienen de `GET /api/user/pagos` (campo
  `deudaComprobantes`).
- **Admin** (`src/app/admin/usuarios/page.tsx`): sección "Deuda" dentro del modal
  de edición de un matriculado, con el mismo modal de detalle. Datos vienen de
  `GET /api/admin/usuarios/[expediente]/deuda` (nuevo endpoint).

## Cómo revertir

Si en algún momento hay que volver al formato viejo (`expediente,monto` simple):

1. En `src/app/api/admin/importar/financiero/route.ts`, tipo `"deudas"`: volver a
   `data = registros.map(r => ({ expediente: getExpediente(r), monto: getMonto(r) })).filter(...)`
   y `prisma.deuda.deleteMany({}); prisma.deuda.createMany({ data });` sin tocar
   `DeudaComprobante`.
2. En `src/app/admin/importar/page.tsx` y `src/app/api/admin/importar/plantilla/route.ts`:
   restaurar `columnas: ["expediente", "monto"]` y las filas de plantilla simples.
3. La tabla `DeudaComprobante` puede quedar sin usarse (no rompe nada) o borrarse
   del schema — es aditiva, no la usa ningún otro flujo.
4. Los botones "Ver detalle" en `MatriculaStatus.tsx` y `admin/usuarios/page.tsx`
   ya están condicionados a que haya comprobantes (`length > 0`) — si dejan de
   cargarse datos ahí, simplemente no se muestran, no hay que sacarlos a mano.

Más simple: `git log` este archivo y el de `financiero/route.ts` para encontrar el
commit anterior a este cambio y revisar el diff puntual.
