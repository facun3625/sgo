import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const password = await bcrypt.hash("Admin@CASF2026!", 10);

    const admin = await prisma.user.upsert({
        where: { expediente: "SUPERADMIN" },
        update: {},
        create: {
            nombre: "Super",
            apellido: "Administrador",
            expediente: "SUPERADMIN",
            cod: "SUPERADMIN",
            password,
            accessLevel: "superadmin",
            status: "active",
            registered: 1,
        },
    });

    console.log("✅ Superadmin creado:", admin.expediente);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
