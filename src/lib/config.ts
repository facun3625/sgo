import prisma from "@/lib/prisma";

export async function getConfigValue(clave: string): Promise<string | null> {
    const record = await prisma.config.findUnique({ where: { clave } });
    return record?.valor ?? null;
}

export async function getJus(): Promise<number> {
    const val = await getConfigValue("jus");
    return val ? parseFloat(val) : 0;
}
