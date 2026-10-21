// Prueba en seco (sin pegarle a Payway, sin cobrar nada) de cómo queda armado
// el "Id operación" que ve Payway en su panel. Correr con:
//   npx --yes tsx scripts/check-payway-id.ts
import { construirSiteTransactionId } from "../src/lib/payway";

console.log("Ejemplos de 'Id operación' con el formato nuevo:\n");
console.log(construirSiteTransactionId("producto", 8956, "Compra: Token de Firma Digital"));
console.log(construirSiteTransactionId("curso", 709, "Taller de Derecho Penal Avanzado"));
console.log(construirSiteTransactionId("matricula_mensual", "10731", "Cuota mensual 2026-10"));
console.log(construirSiteTransactionId("deuda", "10731", "Deuda pendiente — 2 comprobantes"));
