import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("Seeding real events for current month...");

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const events = [
        {
            titulo: "Mesa Educativa CASF",
            descripcion: "Debate abierto sobre la formación continua de los matriculados y nuevos programas de postgrado.",
            fecha: new Date(year, month, now.getDate() + 2),
            tipo: "institucional"
        },
        {
            titulo: "After Office Social",
            descripcion: "Encuentro de relajación y networking en el patio del colegio. ¡Los esperamos!",
            fecha: new Date(year, month, now.getDate() + 5),
            tipo: "social"
        },
        {
            titulo: "Feriado Puente Institucional",
            descripcion: "El colegio permanecerá cerrado por asueto administrativo.",
            fecha: new Date(year, month, now.getDate() + 1),
            tipo: "feriado"
        }
    ];

    for (const event of events) {
        await prisma.evento.create({
            data: event
        });
    }

    console.log("Seeding finished.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
