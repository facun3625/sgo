"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, Link as LinkIcon, Unlink } from "lucide-react";

interface Props {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({ heading: false }),
            Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
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
            </div>
            <div className="px-3 py-2.5">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
