"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail } from "lucide-react";
import Link from "next/link";

export default function AdminMensajesIcon() {
    const [count, setCount] = useState(0);

    const fetch_ = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/mensajes/unread");
            if (!res.ok) return;
            const data = await res.json();
            setCount(data.count ?? 0);
        } catch {}
    }, []);

    useEffect(() => {
        fetch_();
        const interval = setInterval(fetch_, 30000);
        return () => clearInterval(interval);
    }, [fetch_]);

    return (
        <Link href="/admin/mensajes"
            className="p-2 text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-all relative"
            aria-label="Mensajes">
            <Mail size={20} />
            {count > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-sky-400 text-white text-[9px] font-black rounded-full border-2 border-green-900 flex items-center justify-center leading-none">
                    {count > 9 ? "9+" : count}
                </span>
            )}
        </Link>
    );
}
