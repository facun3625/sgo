import Image from "next/image";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex bg-white">
            {/* Panel izquierdo - Branding (1/3) */}
            <div className="hidden md:flex md:w-[40%] bg-gradient-to-b from-[#063f68] to-[#0a527e] relative flex-col items-center justify-center p-12 overflow-hidden">
                {/* Efecto de luz sutil */}
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-3/4 h-1/2 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.07)_0%,transparent_60%)]" />
                    <div className="absolute bottom-0 left-0 w-2/3 h-1/3 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.04)_0%,transparent_60%)]" />
                </div>

                {/* Logo y texto */}
                <div className="relative z-10 flex flex-col items-center text-center">
                    <Image
                        src="/sgo.png"
                        alt="SGO Logo"
                        width={150}
                        height={150}
                        className="mb-8 drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
                        priority
                    />
                    <h1 className="text-white text-3xl font-semibold tracking-tight">
                        SGO - CASF
                    </h1>
                    <div className="w-16 h-[2px] bg-white/25 rounded-full mt-4" />
                </div>

                {/* Footer */}
                <div className="absolute bottom-6 text-white/30 text-xs">
                    © {new Date().getFullYear()} SGO - CASF
                </div>
            </div>

            {/* Panel derecho - Contenido (2/3) */}
            <div className="flex-1 flex items-center justify-center p-8 sm:p-12">
                <div className="w-full max-w-[400px]">{children}</div>
            </div>
        </div>
    );
}
