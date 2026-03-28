import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { GraduationCap, Users, BookOpen } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
    const session = await getSession();

    const [totalCursos, totalInscripciones, totalUsuarios] = await Promise.all([
        prisma.curso.count(),
        prisma.inscripcionCurso.count(),
        prisma.user.count({ where: { accessLevel: "user" } }),
    ]);

    const stats = [
        { label: "Cursos activos", value: totalCursos, icon: GraduationCap, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-900/20", href: "/admin/cursos" },
        { label: "Inscripciones totales", value: totalInscripciones, icon: BookOpen, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", href: "/admin/cursos" },
        { label: "Matriculados", value: totalUsuarios, icon: Users, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", href: "#" },
    ];

    return (
        <div className="p-6 md:p-10 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Bienvenido, {session?.nombre}</h1>
                <p className="text-slate-400 text-sm mt-1">Panel de administración · SGO CASF</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {stats.map((stat) => (
                    <Link key={stat.label} href={stat.href}
                        className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center gap-5 hover:border-slate-200 hover:shadow-md transition-all">
                        <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center shrink-0`}>
                            <stat.icon size={22} className={stat.color} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                            <p className="text-[12px] text-slate-400 font-medium">{stat.label}</p>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h2 className="text-[14px] font-bold text-slate-700 mb-4">Accesos rápidos</h2>
                <div className="flex flex-wrap gap-3">
                    <Link href="/admin/cursos/nuevo"
                        className="flex items-center gap-2 px-4 h-10 bg-[#063f68] text-white rounded-xl text-[12px] font-bold hover:bg-[#0a4d7a] transition-all">
                        <GraduationCap size={15} />
                        Nuevo curso
                    </Link>
                </div>
            </div>
        </div>
    );
}
