import prisma from "@/lib/prisma";
import Link from "next/link";
import { BookOpen, FileText, Plus, Pencil, Tag } from "lucide-react";

export default async function BibliotecaAdminPage() {
    const items = await prisma.biblioteca.findMany({ orderBy: { createdAt: "desc" } });

    return (
        <div className="p-6 md:p-10 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Biblioteca</h1>
                    <p className="text-slate-400 text-sm mt-0.5">{items.length} documento{items.length !== 1 ? "s" : ""} cargado{items.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/admin/biblioteca/categorias"
                        className="flex items-center gap-2 px-4 h-10 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                        <Tag size={14} /> Categorías
                    </Link>
                    <Link href="/admin/biblioteca/nuevo"
                        className="flex items-center gap-2 px-4 h-10 bg-[#063f68] text-white rounded-xl text-[13px] font-bold hover:bg-[#0a4d7a] transition-all">
                        <Plus size={15} /> Nuevo documento
                    </Link>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                    <BookOpen size={32} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">No hay documentos cargados</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {items.map(item => (
                        <div key={item.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
                            {/* Portada */}
                            <div className="h-36 bg-slate-50 dark:bg-slate-800 relative flex-shrink-0">
                                {item.portada ? (
                                    <img src={item.portada} alt={item.titulo} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        {item.tipo === "libro"
                                            ? <BookOpen size={32} className="text-slate-200 dark:text-slate-700" />
                                            : <FileText size={32} className="text-slate-200 dark:text-slate-700" />}
                                    </div>
                                )}
                                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-white
                                        ${item.tipo === "libro" ? "bg-blue-500" : "bg-purple-500"}`}>
                                        {item.tipo === "libro" ? "Libro" : "Jurisprudencia"}
                                    </span>
                                    {!item.activa && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-400 text-white uppercase">Inactivo</span>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 flex flex-col flex-1 gap-1">
                                <p className="text-[11px] text-slate-400 font-medium">{item.categoria}</p>
                                <h3 className="font-bold text-slate-800 dark:text-white text-[14px] leading-snug line-clamp-2">{item.titulo}</h3>
                                <p className="text-[12px] text-slate-400">{item.autor}</p>
                                {item.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {item.tags.slice(0, 4).map(tag => (
                                            <span key={tag} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[10px]">{tag}</span>
                                        ))}
                                        {item.tags.length > 4 && <span className="text-[10px] text-slate-400">+{item.tags.length - 4}</span>}
                                    </div>
                                )}
                                <div className="mt-auto pt-3 flex justify-end">
                                    <Link href={`/admin/biblioteca/${item.id}`}
                                        className="flex items-center gap-1.5 px-3 h-8 text-[12px] font-semibold text-slate-500 dark:text-slate-400 hover:text-[#063f68] dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-[#063f68]/30 transition-all">
                                        <Pencil size={12} /> Editar
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
