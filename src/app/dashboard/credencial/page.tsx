import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import QRComponent from "@/components/dashboard/QRComponent";
import CardActions from "@/components/dashboard/CardActions";

export default async function CredencialPage() {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    const [user, dato] = await Promise.all([
        prisma.user.findUnique({ where: { expediente: session.expediente } }),
        prisma.dato.findFirst({ where: { expediente: session.expediente } })
    ]);

    if (!user) {
        redirect("/login");
    }

    const fechaMatriculacion = dato?.fechaMatriculacion
        ? new Date(dato.fechaMatriculacion).toLocaleDateString("es-AR")
        : "--/--/----";

    const vCardValue = `BEGIN:VCARD\nVERSION:3.0\nFN:${user.nombre} ${user.apellido}\nORG:Colegio de la Abogacía de Santa Fe\nTITLE:Abogado/a - Mat. ${user.expediente}\nTEL;TYPE=WORK:${dato?.movilLegal || dato?.telefonosLegal || ""}\nEMAIL:${dato?.emailLegal || ""}\nURL:https://casf.org.ar\nEND:VCARD`;

    return (
        <div className="bg-white dark:bg-[#02182b] p-0 space-y-0 pb-12 transition-colors duration-300">
            <div className="w-full pt-0">

                {/* SECCIÓN FRENTE */}
                <div className="bg-white dark:bg-[#02182b]">

                    {/* Header Compacto Unificado Sticky */}
                    <div className="sticky top-16 z-10 bg-white dark:bg-[#02182b] flex items-center justify-between px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                        <div className="flex items-center gap-6">
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2 text-black dark:text-white hover:text-slate-700 dark:hover:text-slate-300 transition-all duration-300 group"
                            >
                                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                                <span className="text-[12px] font-medium tracking-tight">Volver</span>
                            </Link>
                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
                            <h1 className="text-[14px] font-medium text-black dark:text-white tracking-tight">Credencial Digital - Frente</h1>
                        </div>
                    </div>

                    <div className="p-6 md:p-10 border-b border-[#f1f5f9] dark:border-slate-800 animate-fade-in">
                        <div className="flex flex-col lg:flex-row gap-10 items-start lg:items-center">

                            {/* Columna del Carnet (Frente) */}
                            <div className="flex-1 w-full max-w-[450px]">
                                <div id="digital-credential-front" className="relative aspect-[1.58/1] w-full bg-white rounded-[20px] shadow-xl border border-[#e2e8f0] overflow-hidden flex flex-col p-6 pointer-events-none select-none">

                                    {/* Top: Logo y Título */}
                                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#f1f5f9]">
                                        <img src="/sgo.png" alt="Logo" className="w-10 h-10 object-contain" />
                                        <div>
                                            <h2 className="text-[#063f68] text-[11px] font-bold leading-tight">Colegio de la Abogacía de Santa Fe</h2>
                                            <h2 className="text-[#94a3b8] text-[9px] font-black uppercase tracking-tighter">Credencial Profesional</h2>
                                        </div>
                                    </div>

                                    {/* Middle: Foto y Datos */}
                                    <div className="flex gap-6 items-start">
                                        <div className="w-[85px] h-[110px] bg-[#f8fafc] rounded-lg overflow-hidden border border-[#e2e8f0] shrink-0 relative">
                                            {user.image ? (
                                                <img
                                                    src={user.image}
                                                    alt="Perfil"
                                                    className="absolute inset-0 w-full h-full"
                                                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[#063f68]/15 font-black text-xl">
                                                    {user.nombre[0]}{user.apellido[0]}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <h3 className="text-black text-[15px] font-bold uppercase leading-tight mb-3">
                                                {user.apellido}, {user.nombre}
                                            </h3>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-[#94a3b8] font-bold uppercase">Expediente: <span className="text-black ml-1 font-extrabold">{user.expediente}</span></p>
                                                <p className="text-[10px] text-[#94a3b8] font-bold uppercase">DNI: <span className="text-black ml-1 font-extrabold">{dato?.documento || "---"}</span></p>
                                                <p className="text-[10px] text-[#94a3b8] font-bold uppercase">Folio/Tomo: <span className="text-black ml-1 font-extrabold">{dato?.folio || "--"} / {dato?.tomo || "--"}</span></p>
                                                <p className="text-[10px] text-[#94a3b8] font-bold uppercase">Matriculación: <span className="text-black ml-1 font-extrabold">{fechaMatriculacion}</span></p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom: Firma y QR */}
                                    <div className="mt-auto flex items-end justify-between">
                                        <div className="flex flex-col border-t border-[#f1f5f9] pt-1 w-28">
                                            <div className="h-10 flex items-center justify-center">
                                                {user.signature ? (
                                                    <img src={user.signature} alt="Firma" className="max-w-full max-h-full object-contain mix-blend-multiply" />
                                                ) : (
                                                    <span className="text-[8px] italic text-[#f1f5f9]">Firma del Matriculado</span>
                                                )}
                                            </div>
                                            <p className="text-[7px] font-black text-[#94a3b8] uppercase tracking-widest text-center">Titular</p>
                                        </div>

                                        <div className="bg-white border border-[#f8fafc] p-1 rounded-lg">
                                            <QRComponent value={vCardValue} size={48} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Columna de Acciones Lateral */}
                            <div className="w-full lg:w-64 space-y-4">
                                <div className="p-5 rounded-[24px] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium leading-relaxed">
                                        Identificación oficial del Colegio de la Abogacía de Santa Fe.
                                    </p>
                                </div>

                                <CardActions
                                    targetId="digital-credential-front"
                                    fileName={`Credencial-Frente-${user.expediente}`}
                                    title="Frente Credencial"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECCIÓN DORSO (Separada por la línea del anterior) */}
                <div className="bg-white dark:bg-[#02182b]">
                    {/* Header Dorso Sticky */}
                    <div className="sticky top-16 z-10 bg-white dark:bg-[#02182b] flex items-center justify-between px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                        <h2 className="text-[14px] font-medium text-black dark:text-white tracking-tight">Credencial Digital - Dorso</h2>
                    </div>

                    <div className="p-6 md:p-10 animate-fade-in">
                        <div className="flex flex-col lg:flex-row gap-10 items-start lg:items-center">

                            {/* Columna del Carnet (Dorso) */}
                            <div className="flex-1 w-full max-w-[450px]">
                                <div id="digital-credential-back" className="relative aspect-[1.58/1] w-full bg-white rounded-[20px] shadow-xl border border-[#e2e8f0] overflow-hidden flex flex-col p-8 pointer-events-none select-none">
                                    <div className="flex-1">
                                        <p className="text-[#475569] text-[11px] leading-relaxed italic font-medium mb-10 text-center border-b border-[#f1f5f9] pb-6">
                                            "En el ejercicio de su profesión, el abogado está equiparado a los magistrados judiciales en cuanto al respeto y consideración que debe guardársele."
                                        </p>

                                        <div className="flex justify-around items-end">
                                            <div className="text-center">
                                                <div className="h-10 flex items-center justify-center mb-1">
                                                    <span className="text-[12px] font-serif text-[#f1f5f9] italic opacity-40">Firma Autoridad</span>
                                                </div>
                                                <div className="border-t border-[#f1f5f9] pt-1">
                                                    <p className="text-[8px] font-bold text-slate-800">Presidencia</p>
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <div className="h-10 flex items-center justify-center mb-1">
                                                    <span className="text-[12px] font-serif text-[#f1f5f9] italic opacity-40">Firma Autoridad</span>
                                                </div>
                                                <div className="border-t border-[#f1f5f9] pt-1">
                                                    <p className="text-[8px] font-bold text-slate-800">Secretaría</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-4 text-center border-t border-[#f1f5f9]">
                                        <p className="text-[#94a3b8] text-[8px] font-black uppercase tracking-tighter">
                                            Matrícula válida en Santa Fe · Propiedad del CPASF · Intransferible
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Columna de Acciones Lateral */}
                            <div className="w-full lg:w-64 space-y-4">
                                <div className="p-5 rounded-[24px] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium leading-relaxed">
                                        Leyenda legal y firmas de las autoridades institucionales.
                                    </p>
                                </div>

                                <CardActions
                                    targetId="digital-credential-back"
                                    fileName={`Credencial-Dorso-${user.expediente}`}
                                    title="Dorso Credencial"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Estilos Print */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; }
                    .min-h-screen { height: auto !important; min-height: 0 !important; padding: 0 !important; }
                    .max-w-6xl { max-width: none !important; margin: 0 !important; }
                }
            `}} />
        </div>
    );
}
