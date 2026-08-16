// Provincias argentinas y su código de un carácter para Cybersource (bill_to.state /
// ship_to.state). Se comparte entre el backend (src/lib/payway.ts) y el desplegable
// del formulario de pago (PaywayCardForm) para que el valor elegido siempre matchee
// exacto — antes era un input de texto libre y una variante de nombre no reconocida
// hacía que Cybersource rechazara el pago con "Invalid BillTo State".
export const PROVINCIAS_AR: { nombre: string; codigo: string }[] = [
    { nombre: "CABA", codigo: "C" },
    { nombre: "Buenos Aires", codigo: "B" },
    { nombre: "Catamarca", codigo: "K" },
    { nombre: "Chaco", codigo: "H" },
    { nombre: "Chubut", codigo: "U" },
    { nombre: "Córdoba", codigo: "X" },
    { nombre: "Corrientes", codigo: "W" },
    { nombre: "Entre Ríos", codigo: "E" },
    { nombre: "Formosa", codigo: "P" },
    { nombre: "Jujuy", codigo: "Y" },
    { nombre: "La Pampa", codigo: "L" },
    { nombre: "La Rioja", codigo: "F" },
    { nombre: "Mendoza", codigo: "M" },
    { nombre: "Misiones", codigo: "N" },
    { nombre: "Neuquén", codigo: "Q" },
    { nombre: "Río Negro", codigo: "R" },
    { nombre: "Salta", codigo: "A" },
    { nombre: "San Juan", codigo: "J" },
    { nombre: "San Luis", codigo: "D" },
    { nombre: "Santa Cruz", codigo: "Z" },
    { nombre: "Santa Fe", codigo: "S" },
    { nombre: "Santiago del Estero", codigo: "G" },
    { nombre: "Tierra del Fuego", codigo: "V" },
    { nombre: "Tucumán", codigo: "T" },
];
