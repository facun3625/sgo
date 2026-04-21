import prisma from "@/lib/prisma";
import Link from "next/link";
import { GraduationCap, Plus, Pencil, Users, Calendar, MapPin, ToggleLeft, ToggleRight, UserCheck, Award } from "lucide-react";

export default async function AdminCursosPage() {
    const cursos = await prisma.curso.findMany({
        include: {
            opciones: true,
            _count: { select: { inscripciones: true } }
        },
        orderBy: { fecha: "asc" }
    });

    return (
        <div className="p-6 md:p-10 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">Cursos</h1>
                    <p className="text-slate-400 text-sm mt-0.5">{cursos.length} curso{cursos.length !== 1 ? "s" : ""} cargado{cursos.length !== 1 ? "s" : ""}</p>
                </div>
                <Link href="/admin/cursos/nuevo"
                    className="flex items-center gap-2 px-5 h-10 bg-[#063f68] text-white rounded-xl text-[13px] font-bold hover:bg-[#0a4d7a] transition-all active:scale-95">
                    <Plus size={16} />
                    Nuevo curso
                </Link>
            </div>

            {/* Lista */}
            {cursos.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center">
                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <GraduationCap size={26} className="text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium mb-1">No hay cursos cargados</p>
                    <p className="text-slate-400 text-sm mb-6">Creá el primer curso para que los matriculados puedan inscribirse.</p>
                    <Link href="/admin/cursos/nuevo"
                        className="inline-flex items-center gap-2 px-6 h-10 bg-[#063f68] text-white rounded-xl text-[13px] font-bold hover:bg-[#0a4d7a] transition-all">
                        <Plus size={15} /> Nuevo curso
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {cursos.map((curso) => {
                        return (
                            <div key={curso.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-md transition-all">
                                {/* Imagen */}
                                <div className="h-40 bg-slate-100 dark:bg-slate-800 relative">
                                    {curso.imagen ? (
                                        <img src={curso.imagen} alt={curso.titulo} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <GraduationCap size={36} className="text-slate-300" />
                                        </div>
                                    )}
                                    {/* Badge activo */}
                                    <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${curso.activo ? "bg-emerald-500 text-white" : "bg-slate-400 text-white"}`}>
                                        {curso.activo ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                                        {curso.activo ? "Activo" : "Inactivo"}
                                    </div>
                                    {/* Badge modalidad */}
                                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#063f68]/90 text-white text-[10px] font-bold uppercase tracking-wider">
                                        {curso.modalidad}
                                    </div>
                                </div>

                                {/* Contenido */}
                                <div className="p-4 space-y-3">
                                    <h3 className="font-bold text-slate-800 dark:text-white text-[14px] leading-tight line-clamp-2">{curso.titulo}</h3>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                            <Calendar size={12} />
                                            {curso.fechaFin
                                                ? `${new Date(curso.fecha).toLocaleDateString("es-AR", { timeZone: "UTC", day: "numeric", month: "short" })} al ${new Date(curso.fechaFin).toLocaleDateString("es-AR", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })}`
                                                : new Date(curso.fecha).toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "long", year: "numeric" })}
                                            {curso.hora && <span>· {curso.hora}</span>}
                                        </div>
                                        {curso.lugar && (
                                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                                <MapPin size={12} />
                                                {curso.lugar}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                            <Users size={12} />
                                            {curso._count.inscripciones} inscripto{curso._count.inscripciones !== 1 ? "s" : ""}
                                        </div>
                                    </div>

                                    {/* Opciones y precio */}
                                    {curso.opciones.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {curso.opciones.map(op => (
                                                <span key={op.id} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                                    {op.nombre} · {op.precio === 0 ? "Gratis" : `$${op.precio.toLocaleString("es-AR")}`}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Acciones */}
                                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-50 dark:border-slate-800">
                                        <Link href={`/admin/cursos/${curso.id}?tab=inscripciones`}
                                            className="flex items-center gap-1.5 px-2.5 h-8 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                                            <Users size={12} />
                                            {curso._count.inscripciones}
                                        </Link>
                                        {curso.tipoAsistencia !== "ninguna" && (
                                            <Link href={`/admin/cursos/${curso.id}/asistencia`}
                                                className="flex items-center gap-1.5 px-2.5 h-8 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-bold hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-all">
                                                <UserCheck size={12} />
                                                Asistencia
                                            </Link>
                                        )}
                                        <Link href={`/admin/cursos/${curso.id}?tab=certificados`}
                                            className="flex items-center gap-1.5 px-2.5 h-8 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-bold hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 transition-all">
                                            <Award size={12} />
                                            Certificados
                                        </Link>
                                        <Link href={`/admin/cursos/${curso.id}`}
                                            className="flex items-center gap-1.5 px-2.5 h-8 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all ml-auto">
                                            <Pencil size={12} />
                                            Editar
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
