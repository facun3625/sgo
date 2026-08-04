export const dynamic = "force-dynamic";
import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, GraduationCap, ArrowRight, LogIn } from "lucide-react";
import prisma from "@/lib/prisma";
import CursoFlyerButton from "@/components/cursos-publicos/CursoFlyerButton";

const UTC = { timeZone: "UTC" } as const;

function formatFecha(fecha: Date, fechaFin: Date | null): string {
    const ini = fecha.toLocaleDateString("es-AR", { ...UTC, day: "numeric", month: "long", year: "numeric" });
    if (!fechaFin) return ini;
    const fin = fechaFin.toLocaleDateString("es-AR", { ...UTC, day: "numeric", month: "long", year: "numeric" });
    return `${ini} al ${fin}`;
}

export default async function CursosPublicosPage() {
    const cursos = await prisma.curso.findMany({
        where: { activo: true, abiertoNoMatriculados: true },
        include: { opciones: true },
        orderBy: { fecha: "asc" },
    });

    const disponibles = cursos.filter(c => c.opciones.some(o => o.precioNoMatriculado != null));

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            {/* Header institucional */}
            <div className="bg-[#063f68] px-6 py-8">
                <div className="max-w-3xl mx-auto flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-1.5 shrink-0">
                        <Image src="/sgo_nuevo.png" alt="CPASF" width={44} height={44} className="object-contain" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-[19px] leading-tight">Cursos abiertos a la comunidad</h1>
                        <p className="text-white/60 text-[12px] font-semibold uppercase tracking-widest">Colegio de la Abogacía · Santa Fe</p>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#063f68]/5 border border-[#063f68]/15 rounded-2xl px-5 py-4">
                    <p className="text-[13px] text-[#063f68] flex-1">
                        <strong>¿Sos matriculado del CPASF?</strong> Inscribite desde adentro del SGO con tu usuario para acceder a tu precio de matriculado.
                    </p>
                    <Link href="/login"
                        className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-[#063f68] text-white rounded-xl text-[12px] font-bold hover:bg-[#0a4d7a] transition-all flex-shrink-0">
                        <LogIn size={13} /> Ingresar al SGO
                    </Link>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-10 space-y-4">
                {disponibles.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
                        <GraduationCap size={32} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No hay cursos abiertos a inscripción pública en este momento.</p>
                    </div>
                ) : (
                    disponibles.map(curso => (
                        <Link key={curso.id} href={`/cursos/${curso.id}`}
                            className="block bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all overflow-hidden">
                            <div className="flex flex-col sm:flex-row">
                                {curso.imagen && (
                                    <div className="relative sm:w-48 h-40 sm:h-auto bg-slate-100 flex-shrink-0">
                                        <img src={curso.imagen} alt={curso.titulo} className="w-full h-full object-cover" />
                                        <CursoFlyerButton imagen={curso.imagen} titulo={curso.titulo} />
                                    </div>
                                )}
                                <div className="p-5 space-y-2 flex-1">
                                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#063f68]/10 text-[#063f68] text-[11px] font-bold uppercase tracking-wider">
                                        {curso.modalidad}
                                    </span>
                                    <h2 className="text-[16px] font-bold text-slate-800 leading-snug">{curso.titulo}</h2>
                                    <p className="text-[13px] text-slate-500 flex items-center gap-1.5">
                                        <Calendar size={12} /> {formatFecha(curso.fecha, curso.fechaFin)}
                                    </p>
                                    {curso.lugar && (
                                        <p className="text-[13px] text-slate-500 flex items-center gap-1.5">
                                            <MapPin size={12} /> {curso.lugar}
                                        </p>
                                    )}
                                    <span className="inline-flex items-center gap-1.5 pt-2 text-[13px] font-bold text-[#063f68]">
                                        Ver detalles e inscribirme <ArrowRight size={14} />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
