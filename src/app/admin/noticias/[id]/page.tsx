import prisma from "@/lib/prisma";
import NoticiaForm from "../NoticiaForm";
import { notFound } from "next/navigation";

export default async function EditarNoticiaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const noticia = await prisma.noticia.findUnique({ where: { id: parseInt(id) } });
    if (!noticia) notFound();
    return <NoticiaForm initialData={noticia} />;
}
