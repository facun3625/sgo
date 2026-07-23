"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface Props {
    inscripcionId: number;
    label?: string;
    className?: string;
    disabled?: boolean;
}

export default function GuestMpPayButton({ inscripcionId, label = "Pagar con Mercado Pago", className, disabled }: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handlePay() {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/cursos/pago/mercadopago", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ inscripcionId }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Error al iniciar el pago.");
                return;
            }
            window.location.href = data.init_point;
        } catch {
            setError("Error de conexión.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-1.5">
            <button
                onClick={handlePay}
                disabled={disabled || loading}
                className={className ?? "flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-[#009ee3] hover:bg-[#007eb5] text-white text-[13px] font-bold disabled:opacity-50 transition-all"}
            >
                {loading ? (
                    <Loader2 size={15} className="animate-spin" />
                ) : (
                    <svg viewBox="0 0 52 52" className="w-4 h-4 fill-white" xmlns="http://www.w3.org/2000/svg">
                        <path d="M26 0C11.664 0 0 11.664 0 26s11.664 26 26 26 26-11.664 26-26S40.336 0 26 0zm0 6c5.075 0 9.752 1.708 13.5 4.547L10.547 39.5A19.912 19.912 0 0 1 6 26C6 14.954 14.954 6 26 6zm0 40c-5.075 0-9.752-1.708-13.5-4.547L41.453 12.5A19.912 19.912 0 0 1 46 26c0 11.046-8.954 20-20 20z"/>
                    </svg>
                )}
                {loading ? "Procesando..." : label}
            </button>
            {error && <p className="text-[11px] text-rose-500 font-semibold">{error}</p>}
        </div>
    );
}
