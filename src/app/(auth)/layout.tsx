import Image from "next/image";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex bg-white">
            {/* Panel izquierdo */}
            <div className="hidden md:flex md:w-[42%] bg-[#052e4a] relative flex-col items-center justify-center p-12 overflow-hidden">

                {/* Fondo con patrón geométrico sutil */}
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.06)_0%,transparent_55%)]" />
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-[radial-gradient(ellipse_at_bottom_left,rgba(6,63,104,0.8)_0%,transparent_70%)]" />
                    {/* Círculos decorativos */}
                    <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full border border-white/[0.04]" />
                    <div className="absolute -top-16 -right-16 w-[280px] h-[280px] rounded-full border border-white/[0.06]" />
                    <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full border border-white/[0.03]" />
                    <div className="absolute bottom-32 right-0 w-[180px] h-[180px] rounded-full border border-white/[0.05]" />
                </div>

                {/* Logo y título */}
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-[120px] h-[120px] flex items-center justify-center mb-6">
                        <Image
                            src="/sgo.png"
                            alt="CPASF"
                            width={120}
                            height={120}
                            className="drop-shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
                            priority
                        />
                    </div>
                    <h1 className="text-white text-2xl font-bold tracking-tight mb-1">
                        CPASF
                    </h1>
                    <p className="text-white/50 text-[11px] font-semibold uppercase tracking-[0.2em]">
                        Colegio de Profesionales de la Abogacía de Santa Fe
                    </p>
                    <div className="w-12 h-px bg-white/20 rounded-full mt-5 mb-5" />
                    <p className="text-white/40 text-[12px] leading-relaxed max-w-[200px]">
                        Sistema de Gestión Operativa
                    </p>
                </div>

                {/* Footer */}
                <div className="absolute bottom-6 z-10 text-white/20 text-[11px]">
                    © {new Date().getFullYear()} SGO · CPASF · 1ª Circunscripción
                </div>
            </div>

            {/* Panel derecho */}
            <div className="flex-1 relative flex items-start md:items-center justify-center px-5 pt-10 pb-8 sm:p-12 bg-white overflow-hidden">
                {/* Círculos decorativos grises - solo desktop */}
                <div className="hidden md:block absolute -top-24 -right-24 w-[320px] h-[320px] rounded-full border border-gray-100" />
                <div className="hidden md:block absolute -top-8 -right-8 w-[200px] h-[200px] rounded-full border border-gray-100" />
                <div className="hidden md:block absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full border border-gray-100" />
                <div className="hidden md:block absolute -bottom-12 -right-12 w-[220px] h-[220px] rounded-full border border-gray-100" />
                <div className="w-full max-w-[400px] mx-auto relative z-10">
                    {children}
                    <a href="https://kubbo.com.ar" target="_blank" rel="noopener noreferrer"
                        className="block mt-10 text-center text-[10px] text-slate-300 hover:text-slate-400 transition-colors">
                        Desarrollado por <span style={{ color: "#3EDE7C" }}>kubbo</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
