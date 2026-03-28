import prisma from "@/lib/prisma";
import BibliotecaForm from "../BibliotecaForm";
import { notFound } from "next/navigation";

export default async function EditarDocumentoPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const item = await prisma.biblioteca.findUnique({ where: { id: parseInt(id) } });
    if (!item) notFound();
    return <BibliotecaForm initialData={item} />;
}
