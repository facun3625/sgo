import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
    GraduationCap, Users, BookOpen, ClipboardList, Banknote,
    UserCheck, MessageSquare, Send, Scale, FileText, TrendingUp, Clock
} from "lucide-react";
import Link from "next/link";

function puede(permisos: string[] | null, key: string): boolean {
    if (permisos === null) return true; // superadmin
    if (key === "solicitudes") return permisos.includes("solicitudes") || permisos.some(p => p.startsWith("solicitudes:"));
    return permisos.includes(key);
}

export default async function AdminDashboard() {
    const session = await getSession();
    const permisos: string[] | null = session?.accessLevel === "superadmin" ? null : (session?.permisos ?? []);

    const verSolicitudes  = puede(permisos, "solicitudes");
    const verAdhesiones   = puede(permisos, "adhesiones");
    const verCambios      = puede(permisos, "cambios-datos");
    const verMensajes     = puede(permisos, "mensajes");
    const verUsuarios     = puede(permisos, "usuarios");
    const verCursos       = puede(permisos, "cursos");
    const verEnvios       = puede(permisos, "envios");
    const verTribunal     = puede(permisos, "tribunal-etica");

    const [
        totalUsuarios,
        totalCursos,
        totalInscripciones,
        solicitudesPendientes,
        adhesionesPendientes,
        cambiosSinLeer,
        mensajesSinLeer,
        enviosMasivos,
        tribunalActivos,
        ultimasSolicitudes,
        ultimosCambios,
    ] = await Promise.all([
        verUsuarios     ? prisma.user.count({ where: { accessLevel: "user" } }) : Promise.resolve(0),
        verCursos       ? prisma.curso.count({ where: { activo: true } }) : Promise.resolve(0),
        verCursos       ? prisma.inscripcionCurso.count() : Promise.resolve(0),
        verSolicitudes  ? prisma.solicitud.count({ where: { estado: "pendiente" } }) : Promise.resolve(0),
        verAdhesiones   ? prisma.adhesionDebito.count({ where: { estado: "pendiente" } }) : Promise.resolve(0),
        verCambios      ? prisma.cambioDatos.count({ where: { leido: false } }) : Promise.resolve(0),
        verMensajes     ? prisma.mensajeChat.count({ where: { de: "user", leido: false } }) : Promise.resolve(0),
        verEnvios       ? prisma.envioMasivo.count() : Promise.resolve(0),
        verTribunal     ? prisma.tribunalEtica.count() : Promise.resolve(0),
        verSolicitudes  ? prisma.solicitud.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, tipo: true, estado: true, expediente: true, createdAt: true } }) : Promise.resolve([]),
        verCambios      ? prisma.cambioDatos.findMany({ orderBy: { createdAt: "desc" }, take: 4, select: { id: true, expediente: true, campos: true, leido: true, createdAt: true } }) : Promise.resolve([]),
    ]);

    const allExps = [...new Set([...ultimasSolicitudes.map(s => s.expediente), ...ultimosCambios.map(c => c.expediente)])];
    const usuarios = allExps.length > 0 ? await prisma.user.findMany({
        where: { expediente: { in: allExps } },
        select: { expediente: true, nombre: true, apellido: true },
    }) : [];
    const userMap = Object.fromEntries(usuarios.map(u => [u.expediente, u]));

    const alertCards = [
        verSolicitudes && { label: "Trámites pendientes",       value: solicitudesPendientes, icon: ClipboardList, color: "text-amber-500",  bg: "bg-amber-500/10",  href: "/admin/solicitudes",   urgent: solicitudesPendientes > 0 },
        verAdhesiones  && { label: "Débitos pendientes",         value: adhesionesPendientes,  icon: Banknote,      color: "text-emerald-500", bg: "bg-emerald-500/10", href: "/admin/adhesiones",    urgent: adhesionesPendientes > 0 },
        verCambios     && { label: "Cambios de datos sin leer",  value: cambiosSinLeer,        icon: UserCheck,     color: "text-violet-500",  bg: "bg-violet-500/10", href: "/admin/cambios-datos",  urgent: cambiosSinLeer > 0 },
        verMensajes    && { label: "Mensajes sin responder",     value: mensajesSinLeer,       icon: MessageSquare, color: "text-sky-500",     bg: "bg-sky-500/10",    href: "/admin/mensajes",       urgent: mensajesSinLeer > 0 },
    ].filter(Boolean) as { label: string; value: number; icon: any; color: string; bg: string; href: string; urgent: boolean }[];

    const statCards = [
        verUsuarios && { label: "Matriculados",    value: totalUsuarios,      icon: Users,        color: "text-indigo-500", bg: "bg-indigo-500/10", href: "/admin/usuarios" },
        verCursos   && { label: "Cursos activos",  value: totalCursos,        icon: GraduationCap, color: "text-pink-500",  bg: "bg-pink-500/10",  href: "/admin/cursos" },
        verCursos   && { label: "Inscripciones",   value: totalInscripciones, icon: BookOpen,      color: "text-blue-500",  bg: "bg-blue-500/10",  href: "/admin/cursos" },
        verEnvios   && { label: "Envíos masivos",  value: enviosMasivos,      icon: Send,          color: "text-amber-500", bg: "bg-amber-500/10", href: "/admin/envios" },
        verTribunal && { label: "Tribunal de Ética", value: tribunalActivos,  icon: Scale,         color: "text-rose-500",  bg: "bg-rose-500/10",  href: "/admin/tribunal-etica" },
    ].filter(Boolean) as { label: string; value: number; icon: any; color: string; bg: string; href: string }[];

    const accesosRapidos = [
        verCursos      && { href: "/admin/cursos/nuevo",   label: "Nuevo curso",         icon: GraduationCap, color: "bg-pink-500" },
        verSolicitudes && { href: "/admin/solicitudes",    label: "Ver trámites",         icon: ClipboardList, color: "bg-amber-500" },
        verEnvios      && { href: "/admin/envios",         label: "Envío masivo",         icon: Send,          color: "bg-amber-600" },
        verUsuarios    && { href: "/admin/usuarios",       label: "Gestionar usuarios",   icon: Users,         color: "bg-indigo-500" },
    ].filter(Boolean) as { href: string; label: string; icon: any; color: string }[];

    const estadoColors: Record<string, string> = {
        pendiente: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
        completada: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
        rechazada: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
    };

    function timeAgo(date: Date) {
        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
        return `hace ${Math.floor(diff / 86400)} d`;
    }

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        Bienvenido, {session?.nombre} 👋
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Panel de administración · SGO CPASF</p>
                </div>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-[12px] text-slate-400 font-medium">
                    <Clock size={14} />
                    {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                </div>
            </div>

            {/* Alertas */}
            {alertCards.length > 0 && (
                <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <TrendingUp size={12} /> Requieren atención
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {alertCards.map(card => (
                            <Link key={card.label} href={card.href}
                                className={`relative p-5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${card.urgent
                                    ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm"
                                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60"
                                }`}>
                                {card.urgent && <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                                    <card.icon size={17} className={card.color} />
                                </div>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{card.value}</p>
                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{card.label}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats generales */}
            {statCards.length > 0 && (
                <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Resumen general</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {statCards.map(card => (
                            <Link key={card.label} href={card.href}
                                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm transition-all group">
                                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                    <card.icon size={17} className={card.color} />
                                </div>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{card.value}</p>
                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{card.label}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Actividad reciente */}
            {(verSolicitudes || verCambios) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {verSolicitudes && (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <FileText size={14} className="text-amber-500" />
                                    <p className="text-[13px] font-bold text-slate-800 dark:text-white">Últimas solicitudes</p>
                                </div>
                                <Link href="/admin/solicitudes" className="text-[11px] font-bold text-[#063f68] dark:text-blue-400 hover:underline">Ver todas</Link>
                            </div>
                            <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                {ultimasSolicitudes.length === 0 ? (
                                    <p className="text-center text-slate-400 text-[12px] py-8">Sin solicitudes</p>
                                ) : ultimasSolicitudes.map(s => {
                                    const u = userMap[s.expediente];
                                    return (
                                        <Link key={s.id} href="/admin/solicitudes" className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                                <ClipboardList size={14} className="text-slate-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-bold text-slate-800 dark:text-white truncate">{s.tipo}</p>
                                                <p className="text-[11px] text-slate-400 truncate">{u ? `${u.apellido}, ${u.nombre}` : `Mat. ${s.expediente}`}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${estadoColors[s.estado] ?? "bg-slate-100 text-slate-500"}`}>{s.estado}</span>
                                                <span className="text-[10px] text-slate-300 dark:text-slate-600">{timeAgo(s.createdAt)}</span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {verCambios && (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <UserCheck size={14} className="text-violet-500" />
                                    <p className="text-[13px] font-bold text-slate-800 dark:text-white">Cambios de datos recientes</p>
                                </div>
                                <Link href="/admin/cambios-datos" className="text-[11px] font-bold text-[#063f68] dark:text-blue-400 hover:underline">Ver todos</Link>
                            </div>
                            <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                {ultimosCambios.length === 0 ? (
                                    <p className="text-center text-slate-400 text-[12px] py-8">Sin cambios recientes</p>
                                ) : ultimosCambios.map(c => {
                                    const u = userMap[c.expediente];
                                    const cantCampos = Object.keys(c.campos as object).length;
                                    return (
                                        <Link key={c.id} href="/admin/cambios-datos" className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0 relative">
                                                <UserCheck size={14} className="text-violet-500" />
                                                {!c.leido && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-500" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-bold text-slate-800 dark:text-white truncate">{u ? `${u.apellido}, ${u.nombre}` : `Mat. ${c.expediente}`}</p>
                                                <p className="text-[11px] text-slate-400">{cantCampos} campo{cantCampos !== 1 ? "s" : ""} modificado{cantCampos !== 1 ? "s" : ""}</p>
                                            </div>
                                            <span className="text-[10px] text-slate-300 dark:text-slate-600 shrink-0">{timeAgo(c.createdAt)}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Accesos rápidos */}
            {accesosRapidos.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Accesos rápidos</p>
                    <div className="flex flex-wrap gap-3">
                        {accesosRapidos.map(a => (
                            <Link key={a.href} href={a.href}
                                className={`flex items-center gap-2 px-4 h-9 ${a.color} text-white rounded-xl text-[12px] font-bold hover:opacity-90 transition-all active:scale-95`}>
                                <a.icon size={14} />
                                {a.label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
