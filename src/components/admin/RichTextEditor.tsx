"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, Link as LinkIcon, Unlink, ImagePlus, Loader2 } from "lucide-react";

interface Props {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    /** Si se pasa, habilita el botón de insertar imagen dentro del texto (sube el archivo a esta URL) */
    uploadUrl?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, uploadUrl }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [subiendoImagen, setSubiendoImagen] = useState(false);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({ heading: false }),
            Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
            Image.configure({ HTMLAttributes: { style: "max-width:100%;border-radius:8px;" } }),
            Placeholder.configure({ placeholder: placeholder || "Escribí el mensaje..." }),
        ],
        content: value,
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none focus:outline-none min-h-[160px] text-[14px] text-slate-800 dark:text-white",
            },
        },
    });

    if (!editor) return null;

    function toggleLink() {
        if (!editor) return;
        if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
            return;
        }
        const url = window.prompt("URL del link:");
        if (url) editor.chain().focus().setLink({ href: url }).run();
    }

    async function handleInsertarImagen(file: File) {
        if (!uploadUrl || !editor) return;
        setSubiendoImagen(true);
        try {
            const form = new FormData();
            form.append("file", file);
            const res = await fetch(uploadUrl, { method: "POST", body: form });
            const data = await res.json();
            if (!res.ok) return;
            editor.chain().focus().setImage({ src: data.url }).run();
        } finally {
            setSubiendoImagen(false);
        }
    }

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${editor.isActive("bold") ? "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                    <Bold size={13} />
                </button>
                <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${editor.isActive("italic") ? "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                    <Italic size={13} />
                </button>
                <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${editor.isActive("bulletList") ? "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                    <List size={13} />
                </button>
                <button type="button" onClick={toggleLink}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${editor.isActive("link") ? "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                    {editor.isActive("link") ? <Unlink size={13} /> : <LinkIcon size={13} />}
                </button>
                {uploadUrl && (
                    <>
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={subiendoImagen}
                            title="Insertar imagen"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all disabled:opacity-50">
                            {subiendoImagen ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleInsertarImagen(f); e.target.value = ""; }} />
                    </>
                )}
            </div>
            <div className="px-3 py-2.5">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
