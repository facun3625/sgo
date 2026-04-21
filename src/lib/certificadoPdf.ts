interface Firma {
    nombre: string | null;
    cargo: string;
    firma: string | null;
}

interface CertData {
    alumno: { nombre: string; apellido: string; expediente: string };
    curso: { titulo: string; fecha: string; fechaFin: string | null; certTexto: string | null; certCabecera: string | null };
    firmas: Firma[];
    emitidoAt: string;
}

async function toDataUrl(url: string): Promise<string> {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function reemplazar(texto: string, alumno: CertData["alumno"], curso: CertData["curso"]): string {
    const fecha = new Date(curso.fecha).toLocaleDateString("es-AR", {
        timeZone: "UTC", day: "numeric", month: "long", year: "numeric"
    });
    return texto
        .replace(/{nombre}/g, alumno.nombre)
        .replace(/{apellido}/g, alumno.apellido)
        .replace(/{expediente}/g, alumno.expediente)
        .replace(/{curso}/g, curso.titulo)
        .replace(/{fecha}/g, fecha);
}

export async function generarCertificadoPdf(data: CertData): Promise<void> {
    const { jsPDF } = await import("jspdf");

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = 297;
    const H = 210;

    // Fondo blanco
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, "F");

    // Borde decorativo
    doc.setDrawColor(6, 63, 104);
    doc.setLineWidth(2);
    doc.rect(8, 8, W - 16, H - 16);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, W - 20, H - 20);

    let y = 18;

    // Cabecera (imagen)
    if (data.curso.certCabecera) {
        try {
            const imgData = await toDataUrl(data.curso.certCabecera);
            // Imagen centrada, max 180mm ancho, 30mm alto
            const imgW = 180;
            const imgH = 30;
            doc.addImage(imgData, "JPEG", (W - imgW) / 2, y, imgW, imgH);
            y += imgH + 6;
        } catch { /* si falla la imagen, continúa */ }
    }

    // Línea separadora
    doc.setDrawColor(6, 63, 104);
    doc.setLineWidth(0.3);
    doc.line(20, y, W - 20, y);
    y += 8;

    // Título "CERTIFICADO"
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(6, 63, 104);
    doc.text("CERTIFICADO", W / 2, y, { align: "center" });
    y += 12;

    // Texto del certificado
    const textoBase = data.curso.certTexto ||
        "Se certifica que {apellido}, {nombre} (Matrícula N° {expediente}) participó del curso \"{curso}\".";
    const texto = reemplazar(textoBase, data.alumno, data.curso);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.setTextColor(50, 50, 50);
    const lineas = doc.splitTextToSize(texto, W - 60);
    doc.text(lineas, W / 2, y, { align: "center" });
    y += lineas.length * 7 + 8;

    // Fecha de emisión
    const emitido = new Date(data.emitidoAt).toLocaleDateString("es-AR", {
        day: "numeric", month: "long", year: "numeric"
    });
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Emitido el ${emitido}`, W / 2, y, { align: "center" });
    y += 10;

    // Firmas
    if (data.firmas.length > 0) {
        const firmaY = H - 45;
        const espaciado = (W - 40) / data.firmas.length;
        for (let i = 0; i < data.firmas.length; i++) {
            const firma = data.firmas[i];
            const cx = 20 + espaciado * i + espaciado / 2;

            if (firma.firma) {
                try {
                    const imgData = await toDataUrl(firma.firma);
                    doc.addImage(imgData, "PNG", cx - 20, firmaY - 16, 40, 14);
                } catch { /* continúa sin imagen */ }
            }

            doc.setLineWidth(0.3);
            doc.setDrawColor(100, 100, 100);
            doc.line(cx - 25, firmaY, cx + 25, firmaY);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(50, 50, 50);
            if (firma.nombre) doc.text(firma.nombre, cx, firmaY + 5, { align: "center" });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(firma.cargo, cx, firmaY + 10, { align: "center" });
        }
    }

    const nombreArchivo = `certificado-${data.alumno.apellido.toLowerCase()}-${data.curso.titulo.replace(/\s+/g, "-").toLowerCase()}.pdf`;
    doc.save(nombreArchivo);
}
