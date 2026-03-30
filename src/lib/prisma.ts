// SGO - Prisma Client (updated field support)
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
}

export const prisma = (() => {
    if (process.env.NODE_ENV !== "production") {
        // En desarrollo, si el cliente global no tiene 'deuda' o 'solicitud', forzamos recreación
        // Forzamos recreación para que reconozca los nuevos campos del esquema (adjunto, etc)
        const SCHEMA_VERSION = "2026-03-30-v15-admin-permisos";
        if (globalForPrisma.prisma && (globalForPrisma as any).prismaVersion !== SCHEMA_VERSION) {
            console.log(`🔄 Re-initializing Prisma client to version ${SCHEMA_VERSION}...`);
            globalForPrisma.prisma = createPrismaClient();
            (globalForPrisma as any).prismaVersion = SCHEMA_VERSION;
        }
    }
    return globalForPrisma.prisma || createPrismaClient();
})();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
