import prisma from "@/lib/prisma";
import Link from "next/link";
import { Newspaper, Plus, Pencil, Star, ToggleLeft, ToggleRight } from "lucide-react";

// Noticias viejas se guardaron como texto plano; las nuevas vienen como HTML del editor
function previewTexto(contenido: string): string {
    if (!/^\s*<[a-z][\s\S]*>/i.test(contenido)) return contenido;
    return contenido.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default async function AdminNoticiasPage() {
    const noticias = await prisma.noticia.findMany({ orderBy: { createdAt: "desc" } });

    return (
        <div className="p-6 md:p-10 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Noticias</h1>
                    <p className="text-slate-400 text-sm mt-0.5">{noticias.length} noticia{noticias.length !== 1 ? "s" : ""} cargada{noticias.length !== 1 ? "s" : ""}</p>
                </div>
                <Link href="/admin/noticias/nueva"
                    className="flex items-center gap-2 px-5 h-10 bg-[#063f68] text-white rounded-xl text-[13px] font-bold hover:bg-[#0a4d7a] transition-all active:scale-95">
                    <Plus size={16} /> Nueva noticia
                </Link>
            </div>

            {noticias.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Newspaper size={26} className="text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium mb-1">No hay noticias cargadas</p>
                    <p className="text-slate-400 text-sm mb-6">Creá la primera noticia para que aparezca en el dashboard.</p>
                    <Link href="/admin/noticias/nueva"
                        className="inline-flex items-center gap-2 px-6 h-10 bg-[#063f68] text-white rounded-xl text-[13px] font-bold hover:bg-[#0a4d7a] transition-all">
                        <Plus size={15} /> Nueva noticia
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {noticias.map(n => (
                        <div key={n.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-md transition-all flex flex-col">
                            <div className="h-40 bg-slate-100 dark:bg-slate-800 relative flex-shrink-0">
                                {n.imagen ? (
                                    <img src={n.imagen} alt={n.titulo} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Newspaper size={32} className="text-slate-300" />
                                    </div>
                                )}
                                <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${n.activa ? "bg-emerald-500 text-white" : "bg-slate-400 text-white"}`}>
                                    {n.activa ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                                    {n.activa ? "Activa" : "Inactiva"}
                                </div>
                                {n.destacada && (
                                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-white text-[10px] font-bold uppercase tracking-wider">
                                        <Star size={11} fill="white" /> Destacada
                                    </div>
                                )}
                            </div>
                            <div className="p-4 flex flex-col flex-1 gap-3">
                                <h3 className="font-bold text-slate-800 dark:text-white text-[14px] leading-tight line-clamp-2">{n.titulo}</h3>
                                <p className="text-[12px] text-slate-400 line-clamp-2 flex-1">{previewTexto(n.contenido)}</p>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800">
                                    <span className="text-[11px] text-slate-400">
                                        {new Date(n.createdAt).toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })}
                                    </span>
                                    <Link href={`/admin/noticias/${n.id}`}
                                        className="flex items-center gap-1.5 px-3 h-8 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
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
