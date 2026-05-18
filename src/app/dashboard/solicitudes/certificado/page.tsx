"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, FileText, Info, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface UserDatos {
    apellido: string;
    nombre: string;
    documento: string | null;
    expediente: string | null;
    folio: string | null;
    tomo: string | null;
    emailLegal: string | null;
    fechaMatriculacion: string | null;
}

function formatFechaMatriculacion(fecha: string | null): string {
    if (!fecha) return "--";
    return new Date(fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fechaEnLetras(): { dia: string; mes: string; anio: string } {
    const now = new Date();
    const dia = now.getDate().toString();
    const mes = now.toLocaleDateString("es-AR", { month: "long" });
    const anio = now.getFullYear().toString().replace(/(\d{1})(\d{3})/, "$1.$2");
    return { dia, mes, anio };
}

interface FirmanteSnapshot {
    cargo: string;
    nombre: string | null;
    firma: string | null;
}

interface SancionSnapshot {
    texto: string;
    inicio: string;
    fin: string;
}

interface SuspensionSnapshot {
    motivoNombre: string | null;
    comentario: string | null;
    fecha: string;
}

interface CertificateProps {
    datos: UserDatos;
    presentarAnte: string;
    solicitudId: number | null;
    baseUrl: string;
    firmante: FirmanteSnapshot | null;
    sanciones: SancionSnapshot[];
    userStatus: string;
    suspension: SuspensionSnapshot | null;
}

function CertificateDocument({ datos, presentarAnte, solicitudId, baseUrl, firmante, sanciones, userStatus, suspension }: CertificateProps) {
    const { dia, mes, anio } = fechaEnLetras();
    const qrUrl = solicitudId ? `${baseUrl}/verificar/certificado/${solicitudId}` : `${baseUrl}/verificar/${datos.expediente}`;
    const suspendido = userStatus === "suspended";
    const fechaSuspension = suspension?.fecha
        ? new Date(suspension.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
        : null;

    return (
        <div
            style={{
                width: "794px",
                minHeight: "1123px",
                background: "white",
                padding: "60px 70px",
                fontFamily: "Times New Roman, serif",
                fontSize: "14px",
                color: "#000",
                boxSizing: "border-box",
                position: "relative",
            }}
        >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", marginBottom: "20px" }}>
                <img src="/sgo_nuevo.png" alt="Logo" style={{ width: "90px", height: "90px", objectFit: "contain", flexShrink: 0 }} />
                <div style={{ textAlign: "center", flex: 1 }}>
                    <p style={{ fontWeight: "bold", textDecoration: "underline", fontSize: "15px", margin: 0, lineHeight: "1.5" }}>
                        Colegio de Profesionales de la Abogacía de la Primera
                    </p>
                    <p style={{ fontWeight: "bold", textDecoration: "underline", fontSize: "15px", margin: 0, lineHeight: "1.5" }}>
                        Circunscripción Judicial de la Provincia de Santa Fe
                    </p>
                    <p style={{ fontSize: "13px", margin: "6px 0 2px" }}>3 de Febrero 2761 P. 2 · Santa Fe – 3000</p>
                    <p style={{ fontSize: "13px", margin: "2px 0", color: "#063f68" }}>mesaentradas@casf.org.ar</p>
                    <p style={{ fontSize: "13px", margin: "2px 0" }}>Tel. 0342-4592700 – Móvil 3424385634</p>
                </div>
            </div>

            {/* Línea separadora */}
            <div style={{ borderTop: "1.5px solid #000", marginBottom: "36px" }} />

            {/* Cuerpo */}
            <div style={{ textAlign: "justify", lineHeight: "2", fontSize: "15px" }}>
                <p style={{ marginBottom: "20px" }}>
                    <span style={{ textDecoration: "underline", fontWeight: "bold" }}>CERTIFICO:</span>{" "}
                    Que, <strong>{datos.apellido} {datos.nombre}</strong>, DNI {datos.documento || "---"}, se inscribió en la matrícula de este Colegio de Profesionales de la Abogacía de la Primera Circunscripción Judicial de la Provincia de Santa Fe al Folio {datos.folio || "--"}, del Libro {datos.tomo || "--"}, Expediente Nº {datos.expediente} en fecha {formatFechaMatriculacion(datos.fechaMatriculacion)}.
                </p>

                {suspendido ? (
                    <p style={{ marginBottom: "20px" }}>
                        Se deja constancia que el mencionado profesional se encuentra con <strong>matrícula SUSPENDIDA</strong>
                        {fechaSuspension ? ` desde el ${fechaSuspension}` : ""}
                        {suspension?.motivoNombre ? `, por motivo: ${suspension.motivoNombre}` : ""}
                        {suspension?.comentario && !suspension?.motivoNombre ? ` (${suspension.comentario})` : ""}.
                        {sanciones.length === 0 && " No registra sanciones disciplinarias del Tribunal de Conducta en su legajo personal."}
                    </p>
                ) : (
                    <p style={{ marginBottom: "20px" }}>
                        Se deja constancia que el mencionado profesional se encuentra con matrícula vigente{sanciones.length === 0 ? " y no registra sanciones disciplinarias del Tribunal de Conducta en su legajo personal" : ""}.
                    </p>
                )}

                <p style={{ marginBottom: "40px" }}>
                    A los fines de ser presentado ante <strong>{presentarAnte || "_______________"}</strong>, expido el presente a pedido del interesado a los {dia} días del mes de {mes} de {anio}.
                </p>
            </div>

            {/* Sanciones activas del Tribunal de Ética */}
            {sanciones.length > 0 && (
                <div style={{ marginTop: "30px", borderTop: "1.5px solid #000", paddingTop: "16px" }}>
                    <p style={{ fontWeight: "bold", textDecoration: "underline", fontSize: "14px", marginBottom: "10px" }}>
                        OBSERVACIONES DEL TRIBUNAL DE ÉTICA:
                    </p>
                    {sanciones.map((s, i) => (
                        <p key={i} style={{ fontSize: "13px", lineHeight: "1.8", marginBottom: "8px", textAlign: "justify" }}>
                            {s.texto}
                        </p>
                    ))}
                </div>
            )}

            {/* Firma de autoridad + QR */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "40px" }}>
                {firmante ? (
                    <div style={{ textAlign: "center", minWidth: "160px" }}>
                        {firmante.firma && (
                            <img
                                src={firmante.firma}
                                alt="Firma"
                                style={{ maxHeight: "60px", maxWidth: "160px", objectFit: "contain", display: "block", margin: "0 auto 6px" }}
                            />
                        )}
                        <div style={{ borderTop: "1px solid #000", paddingTop: "6px" }}>
                            <p style={{ fontSize: "12px", fontWeight: "bold", margin: 0 }}>{firmante.cargo}</p>
                            {firmante.nombre && <p style={{ fontSize: "11px", margin: "2px 0 0" }}>{firmante.nombre}</p>}
                        </div>
                    </div>
                ) : <div />}
                <div style={{ border: "1px solid #e2e8f0", padding: "6px", borderRadius: "8px", background: "white" }}>
                    <QRCodeSVG value={qrUrl} size={80} level="M" />
                </div>
            </div>

            {/* Footer */}
            <div style={{ position: "absolute", bottom: "50px", left: "70px", right: "70px", textAlign: "center", borderTop: "1px solid #cbd5e1", paddingTop: "12px" }}>
                <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>
                    Documento generado digitalmente por el SGO · Colegio de la Abogacía de Santa Fe
                </p>
            </div>
        </div>
    );
}

export default function SolicitudCertificadoPage() {
    const router = useRouter();
    const certificateRef = useRef<HTMLDivElement>(null);

    const [datos, setDatos] = useState<UserDatos | null>(null);
    const [loading, setLoading] = useState(true);
    const [presentarAnte, setPresentarAnte] = useState("");
    const [status, setStatus] = useState<"idle" | "creating" | "generating" | "uploading">("idle");
    const [solicitudId, setSolicitudId] = useState<number | null>(null);
    const [firmante, setFirmante] = useState<FirmanteSnapshot | null>(null);
    const [sanciones, setSanciones] = useState<SancionSnapshot[]>([]);
    const [userStatus, setUserStatus] = useState<string>("active");
    const [suspension, setSuspension] = useState<SuspensionSnapshot | null>(null);
    const [blocked, setBlocked] = useState<string | null>(null);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    useEffect(() => {
        fetch("/api/user/datos").then(r => r.json()).then(setDatos).finally(() => setLoading(false));
    }, []);

    // Cuando tenemos el solicitudId, el QR ya se actualizó en el DOM → generamos el PDF
    useEffect(() => {
        if (status === "generating" && solicitudId) {
            const timer = setTimeout(() => generateAndUpload(solicitudId), 600);
            return () => clearTimeout(timer);
        }
    }, [status, solicitudId]);

    const generateAndUpload = async (id: number) => {
        if (!certificateRef.current) return;
        setStatus("uploading");

        try {
            const canvas = await html2canvas(certificateRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
            });

            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pdfWidth, pdfHeight);

            const blob = pdf.output("blob");
            const formData = new FormData();
            formData.append("id", String(id));
            formData.append("pdf", blob, `certificado-${id}.pdf`);

            await fetch("/api/user/certificado", { method: "PATCH", body: formData });

            router.push("/dashboard/solicitudes/enviadas");
        } catch (err) {
            console.error("Error generando PDF:", err);
            setStatus("idle");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!datos || !presentarAnte.trim()) return;
        setStatus("creating");

        try {
            const res = await fetch("/api/user/certificado", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    presentarAnte,
                    emailLegal: datos.emailLegal,
                    detalles: { folio: datos.folio, tomo: datos.tomo, expediente: datos.expediente }
                })
            });
            const data = await res.json();
            if (!res.ok) { setBlocked(data.error); setStatus("idle"); return; }
            setSolicitudId(data.id);
            if (data.detalles?.firmante) setFirmante(data.detalles.firmante);
            if (data.detalles?.sanciones?.length) setSanciones(data.detalles.sanciones);
            if (data.detalles?.userStatus) setUserStatus(data.detalles.userStatus);
            if (data.detalles?.suspension) setSuspension(data.detalles.suspension);
            setStatus("generating");
        } catch {
            setStatus("idle");
        }
    };

    const isProcessing = status !== "idle";
    const statusLabel = {
        creating: "Creando solicitud...",
        generating: "Generando certificado...",
        uploading: "Guardando PDF...",
        idle: ""
    }[status];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 size={32} className="text-[#063f68] animate-spin" />
                <p className="text-slate-500 font-medium">Cargando formulario...</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#02182b] pb-20 transition-colors duration-300">

            {/* Certificado oculto para captura */}
            <div style={{ position: "absolute", left: "-9999px", top: 0, zIndex: -1 }}>
                <div ref={certificateRef}>
                    {datos && (
                        <CertificateDocument
                            datos={datos}
                            presentarAnte={presentarAnte}
                            solicitudId={solicitudId}
                            baseUrl={baseUrl}
                            firmante={firmante}
                            sanciones={sanciones}
                            userStatus={userStatus}
                            suspension={suspension}
                        />
                    )}
                </div>
            </div>

            {/* Header */}
            <div className="sticky top-16 z-10 bg-white dark:bg-[#02182b] flex items-center gap-4 px-4 md:px-8 py-3.5 border-b border-[#f1f5f9] dark:border-slate-800 transition-colors duration-300">
                <Link href="/dashboard" className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group">
                    <ChevronLeft size={20} className="text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </Link>
                <div className="flex items-center gap-3">
                    <FileText size={18} className="text-blue-600" />
                    <h2 className="text-[15px] font-bold text-black dark:text-white tracking-tight">Certificado de Matriculación</h2>
                </div>
            </div>

            <div className="p-4 md:p-10 space-y-6 animate-fade-in">

                {blocked && (
                    <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 flex gap-3 items-start">
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-800 text-red-500 shadow-sm shrink-0">
                            <Info size={15} />
                        </div>
                        <p className="text-[13px] text-red-700 dark:text-red-400 font-medium leading-relaxed">{blocked}</p>
                    </div>
                )}

                {/* Aviso */}
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex gap-3 items-start">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 text-amber-500 shadow-sm shrink-0">
                        <Info size={15} />
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400/80 leading-relaxed font-medium">
                        El certificado se genera automáticamente en PDF y quedará disponible en{" "}
                        <Link href="/dashboard/solicitudes/enviadas" className="underline font-bold">Solicitudes enviadas</Link>.{" "}
                        Si necesitás presentarlo ante más de un organismo, podés generar uno nuevo por cada destino.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Datos read-only */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ReadOnly label="Apellido y Nombre" value={`${datos?.apellido || ""}, ${datos?.nombre || ""}`} span={2} />
                        <ReadOnly label="Expediente / Matrícula" value={datos?.expediente} />
                        <ReadOnly label="DNI" value={datos?.documento} />
                        <ReadOnly label="Folio" value={datos?.folio} />
                        <ReadOnly label="Tomo / Libro" value={datos?.tomo} />
                        <ReadOnly label="Fecha de Matriculación" value={formatFechaMatriculacion(datos?.fechaMatriculacion || null)} span={2} />
                    </div>

                    {/* Campo editable */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                            Certificado para ser presentado ante <span className="text-rose-400">*</span>
                        </label>
                        <textarea
                            required
                            value={presentarAnte}
                            onChange={e => setPresentarAnte(e.target.value)}
                            rows={3}
                            className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-black dark:text-white text-sm font-medium focus:ring-2 focus:ring-[#063f68] focus:border-transparent outline-none resize-none transition-all"
                            placeholder="Ej: Organización del Torneo Nacional de Abogados..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isProcessing || !presentarAnte.trim()}
                        className="w-full h-14 bg-[#063f68] dark:bg-blue-600 hover:bg-[#0a4d7a] text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-500/10"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                {statusLabel}
                            </>
                        ) : (
                            <>
                                Generar Certificado
                                <Send size={18} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

function ReadOnly({ label, value, span = 1 }: { label: string; value: string | null | undefined; span?: number }) {
    return (
        <div className={`space-y-1.5 ${span === 2 ? "md:col-span-2" : ""}`}>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            <div className="w-full h-12 px-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 flex items-center text-[13px] text-slate-600 dark:text-slate-400 font-medium">
                {value || "--"}
            </div>
        </div>
    );
}
