"use client";

import { useState, useEffect } from "react";
import { X, Share, Download, Smartphone } from "lucide-react";
import Image from "next/image";

export default function InstallBanner() {
    const [show, setShow] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        // No mostrar si ya está instalada como PWA
        if (window.matchMedia("(display-mode: standalone)").matches) return;
        // No mostrar si ya la cerró
        if (localStorage.getItem("pwa-banner-dismissed")) return;

        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        setIsIOS(ios);

        if (ios) {
            setShow(true);
        } else {
            const handler = (e: Event) => {
                e.preventDefault();
                setDeferredPrompt(e);
                setShow(true);
            };
            window.addEventListener("beforeinstallprompt", handler as any);
            return () => window.removeEventListener("beforeinstallprompt", handler as any);
        }
    }, []);

    const dismiss = () => {
        localStorage.setItem("pwa-banner-dismissed", "1");
        setShow(false);
    };

    const install = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") dismiss();
        setDeferredPrompt(null);
    };

    if (!show) return null;

    return (
        <div className="mx-4 mt-4 rounded-2xl bg-[#063f68] text-white p-4 flex items-start gap-3 shadow-lg">
            <Image src="/sgo.png" alt="SGO" width={40} height={40} className="rounded-xl shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="font-bold text-[13px] leading-tight">Instalá la app en tu cel</p>
                {isIOS ? (
                    <p className="text-[11px] text-white/70 mt-1 leading-relaxed">
                        Tocá <Share size={11} className="inline mb-0.5" /> <strong>Compartir</strong> y luego <strong>"Agregar a pantalla de inicio"</strong>
                    </p>
                ) : (
                    <p className="text-[11px] text-white/70 mt-1">Acceso rápido sin abrir el browser.</p>
                )}
                {!isIOS && (
                    <button
                        onClick={install}
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#063f68] rounded-lg text-[11px] font-bold"
                    >
                        <Download size={12} /> Instalar
                    </button>
                )}
            </div>
            <button onClick={dismiss} className="text-white/50 hover:text-white shrink-0">
                <X size={18} />
            </button>
        </div>
    );
}
