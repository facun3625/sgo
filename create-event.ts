import { PrismaClient } from "./src/generated/prisma";
const prisma = new PrismaClient();

async function main() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const event = await prisma.evento.create({
        data: {
            titulo: "Conferencia de Ética Profesional",
            descripcion: "Disertación obligatoria sobre los nuevos lineamientos de ética en el ejercicio de la abogacía. Entrega de certificados al finalizar.",
            fecha: tomorrow,
            tipo: "institucional"
        }
    });

    console.log("Evento creado con éxito:", event.titulo);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
