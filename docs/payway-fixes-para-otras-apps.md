# Cómo quedó armada la integración con PayWay

Registro de los problemas reales que aparecieron al probar PayWay a fondo en SGO (no solo "no anda", sino por qué), con el código de cada fix. Pensado para copiarlo tal cual a otra app con PayWay a medio instalar.

- Sandbox: `https://developers.decidir.com/api/v2`
- Producción: `https://ventasonline.payway.com.ar/api/v2` (⚠️ **no** `live.decidir.com`, que es de otro producto de la misma empresa)

## 1. Arquitectura base (contexto)

Esto ya estaba armado antes y no cambió, pero es la base de todo lo demás:

1. **Frontend** carga `decidir.js` por `<Script>` (no está en npm), inicializa `new Decidir(apiUrl)` con la **public key**, y tokeniza los datos de la tarjeta en el navegador — el número de tarjeta nunca viaja al propio servidor.
2. El token vuelve al frontend junto con la marca detectada y el bin (primeros 6 dígitos).
3. **Backend** recibe token + marca + bin, recalcula el monto desde la base (nunca confía en lo que manda el cliente) y hace `POST {apiUrl}/payments` con header `apikey: <secretKey>`.
4. La respuesta es **síncrona**: aprobado o rechazado en el momento, sin webhook.

La cuenta de SGO tiene Cybersource obligatorio en la vertical "Retail", así que cada request de cobro lleva también `fraud_detection` con los datos de facturación reales del pagador.

## 2. Detección de marca rota para variantes de débito

**Bug encontrado.**

- **Síntoma**: tarjeta Visa débito real, tipeada a mano. El formulario tira *"Por ahora solo aceptamos Visa y Mastercard con esta opción de pago"* antes de siquiera intentar cobrar.
- **Causa**: `decidir.cardType(numero)` no siempre devuelve exactamente `"visa"` / `"mastercard"` — para variantes de débito devuelve algo como `"Visa Débito"`, y el código comparaba con un `===` textual estricto contra una lista de dos strings.
- **Fix**: normalizar por substring en vez de igualdad exacta, y — esto importa para el punto 4 — **preservar si es débito** en vez de aplanarlo a la marca genérica.

```ts
// PaywayCardForm.tsx (frontend)
// decidir.cardType() puede devolver "Visa Débito", "Visa Electron", etc.
// — hay que preservar si es débito, no solo la marca (ver punto 4).
function normalizarMarca(raw: string | null): string | null {
    if (!raw) return null;
    const s = raw.toLowerCase();
    const esDebito = s.includes("debit") || s.includes("débit");
    if (s.includes("visa"))   return esDebito ? "visa_debito" : "visa";
    if (s.includes("master")) return esDebito ? "mastercard_debito" : "mastercard";
    return null;
}
```

De paso, el texto "Detectada: ..." que ve el usuario ahora también formatea la marca (`visa_debito` → "Visa Débito") en vez de mostrar el string crudo con guión bajo.

## 3. El sandbox no rechaza por fondos — rechaza tarjetas reales

**No es un bug, es cómo funciona el sandbox.**

- **Síntoma**: con la detección de marca ya arreglada, se probó con una tarjeta Visa débito **real** contra el ambiente Sandbox. Rechazo genérico: "El pago fue rechazado. Verificá los datos de la tarjeta o probá con otra."
- **Causa**: el log del servidor mostró el motivo real: `invalid_request_error`, `{ code: "invalid_param", param: "bin" }`. El sandbox de Decidir/Payway (`developers.decidir.com`) solo reconoce un set acotado de tarjetas de prueba — una tarjeta real, por más que tenga fondos, no está en esa lista.
- **Fix**: no hay nada que arreglar en código — hay que probar en sandbox con las tarjetas de prueba que da Payway. Tarjetas reales solo se prueban contra **producción**.

| Marca | Número | Vencimiento | CVV |
|---|---|---|---|
| Visa | 4507 9800 0000 4905 | 12/30 | 123 |
| Mastercard | 5269 9100 1000 0005 | 12/30 | 123 |
| Cabal | 5860 5700 0000 0008 | 12/30 | 123 |

Titular de prueba: `APRO APRO` (aprueba). DNI cualquiera de 8 dígitos.

## 4. El hallazgo grande: débito y crédito son `payment_method_id` distintos

**Bug encontrado — el importante.**

- **Síntoma**: con la marca ya bien detectada ("Visa"), el cobro se seguía rechazando en producción — pero con un error distinto y más profundo: `invalid_request_error`, `validation_errors: [{ code: "invalid_param", param: "bin" }]`. No decía nada de tarjeta no soportada.
- **Causa**: Payway no identifica el medio de pago solo por marca — cada **variante** (Visa crédito, Visa débito, Mastercard crédito, Mastercard débito...) tiene su propio `payment_method_id`, asignado por cuenta/comercio. Mandar el id de crédito con el bin de una tarjeta de débito no da "marca no soportada": el bin simplemente no le pertenece a ese `payment_method_id`, y Payway lo rechaza como parámetro inválido.

Para ver el listado completo de códigos de una cuenta (endpoint no documentado en el README oficial, encontrado a mano):

```bash
curl "https://ventasonline.payway.com.ar/api/v2/payment-methods/all" \
  -H "apikey: <PUBLIC_KEY>"
```

Lo que devolvió para la cuenta de SGO (recortado a lo relevante):

| id | Medio de pago | Nota |
|---|---|---|
| 1 | Visa | Crédito |
| 31 | Visa Débito | Código totalmente distinto al de crédito |
| 104 | MasterCard Payway | No confundir con el genérico "15 MasterCard" — ese da inválido en esta cuenta |
| 105 | MC Debit Payway | No confundir con "133 MC Debit Fiserv" (otro proveedor) |

**Fix** — el mapa de `payment_method_id` se extiende con las variantes de débito, usando la marca ya distinguida del punto 2:

```ts
// payway.ts (backend)
export const PAYWAY_PAYMENT_METHOD_ID: Record<string, number> = {
    visa: 1,
    visa_debito: 31,
    mastercard: 104,
    mastercard_debito: 105,
};
```

Nada de esto es universal — hay que repetir la consulta a `/payment-methods/all` por cada cuenta/comercio nueva antes de asumir que estos números sirven, y por separado para sandbox y producción.

## 5. Sandbox y producción compartían un solo juego de credenciales

**Bug de arquitectura — no es específico de PayWay.**

- **Síntoma**: se cargaron credenciales de producción reales desde el panel de admin mientras el toggle de ambiente decía "Sandbox" — nada avisó que eso pisaba silenciosamente lo que hubiera antes, ni qué ambiente correspondía a lo que estaba guardado.
- **Causa**: la tabla de config guardaba `paywaySiteId` / `paywayPublicKey` / `paywaySecretKey` como **una sola fila cada una**, sin importar el ambiente. El selector de ambiente solo decidía a qué URL de Payway pegarle — nunca cuál juego de claves usar, porque solo existía uno.
- **Fix**: separar en claves sufijadas por ambiente, con **migración transparente**: si todavía no se guardó nada bajo la clave nueva, se usa el valor viejo como si perteneciera al ambiente que esté activo ahora mismo — cero pérdida de datos ya cargados.

```ts
// payway.ts — lectura de config (backend)
// paywaySiteId_developer / paywaySiteId_production, etc.
// Fallback: si no hay clave nueva, se usa la vieja (sin sufijo) tal cual.
async function getPaywayConfig() {
    // ...fetch de todas las claves relevantes...
    const ambiente = map.paywayAmbiente === "production" ? "production" : "developer";
    return {
        siteId:    map[`paywaySiteId_${ambiente}`]    ?? map.paywaySiteId    ?? "",
        publicKey: map[`paywayPublicKey_${ambiente}`] ?? map.paywayPublicKey ?? "",
        secretKey: map[`paywaySecretKey_${ambiente}`] ?? map.paywaySecretKey ?? "",
        ambiente,
        // ...
    };
}
```

El panel de admin quedó rediseñado en base a esto: el ambiente activo arriba de todo con fondo de color (ámbar sandbox / verde producción) y aviso si a ese ambiente le faltan credenciales, y dos tarjetas de credenciales completamente independientes — cada una con su propia etiqueta **"● En uso ahora"** o **"Inactiva"**.

Este patrón (config por-ambiente con sufijo + fallback de migración) sirve igual para cualquier otra integración con sandbox/producción separados, no es específico de Payway.

## 6. No todo rechazo es un bug: montos mínimos reales

Con marca y `payment_method_id` ya corregidos, un cobro de **$10** real en producción se rechazó igual — pero con un motivo totalmente distinto:

```json
{
  "status": "rejected",
  "status_details": {
    "error": {
      "type": "insufficient_amount",
      "reason": { "id": 13, "description": "MONTO INVALIDO" }
    }
  }
}
```

Es el banco emisor rechazando por monto mínimo, no la integración. Con **$500** el mismo flujo aprobó sin tocar una línea de código. Para probar en producción con plata real, conviene arrancar arriba de $100–200.

## 7. Los cobros por PayWay no se veían en el listado contable

**Mejora menor.**

Un pago con `metodoPago: "payway"` quedaba fuera de los filtros por método (solo existían MercadoPago/Banelco/Transferencia/Home Banking/Efectivo) y se mostraba como texto crudo `"payway"` en la tabla en vez de una etiqueta prolija. Se agregó como opción de filtro más su etiqueta correspondiente — un detalle fácil de repetir en cualquier vista de "métodos de pago" que se haya armado antes de sumar PayWay al mix.

## 8. Checklist para aplicar esto en otra app

- [ ] Normalizar la marca detectada por substring, no igualdad exacta (`decidir.cardType()` devuelve variantes como "Visa Débito", "Visa Electron").
- [ ] Preservar débito vs. crédito, no solo la marca — es el dato que decide qué `payment_method_id` corresponde.
- [ ] Consultar `GET /payment-methods/all` con la public key de esa cuenta puntual. Los ids no son universales — repetir por cada comercio nuevo, sandbox y producción por separado.
- [ ] Probar en sandbox solo con las tarjetas de prueba oficiales (tabla arriba) — una tarjeta real ahí da "invalid_param: bin", no significa que esté mal la integración.
- [ ] Guardar credenciales separadas por ambiente, con fallback de migración. Nunca un solo juego de claves compartido entre sandbox y producción.
- [ ] Mostrar en el admin cuál ambiente está activo, bien visible — banner de color arriba de todo, no un toggle chico perdido entre otros campos.
- [ ] Probar con montos realistas en producción — un rechazo por "insufficient_amount" no es un bug de integración.
- [ ] Revisar cualquier filtro de "método de pago" armado antes de sumar PayWay — suele quedar afuera de listas hardcodeadas de métodos ya existentes.

---

Basado en el trabajo hecho sobre SGO (Sistema de Gestión CASF) — integración Decidir/Payway con Cybersource obligatorio, vertical Retail. Los `payment_method_id` y nombres de medios de pago listados son específicos de esa cuenta; el resto del patrón es reutilizable tal cual.
