/**
 * Gatepath Realtors — Rich Text Editor (Phase 40D)
 * Shared staff-facing editor for phase narrative fields (Location Details,
 * Legal & Title). A small toolbar over a Tiptap editable area — the first
 * rich-text (real stored HTML) pattern in this codebase, deliberately
 * scoped to staff-authored-only fields, never a public-submission field.
 */
import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered, RemoveFormatting } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "min-h-[140px] p-3 text-[13px] leading-relaxed focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_strong]:font-bold [&_em]:italic",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep the editor in sync if `value` changes from outside (e.g. the
  // parent dialog is reused across different phases without remounting).
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const btnCls = (active: boolean) =>
    `p-1.5 rounded transition-colors ${
      active ? "bg-primary text-white" : "text-on-surface-variant hover:bg-black/5"
    }`;

  return (
    <div className="border border-outline-variant/40 rounded-lg overflow-hidden bg-white">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-outline-variant/30 bg-black/[0.02]">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnCls(editor.isActive("bold"))}
          aria-label="Bold"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnCls(editor.isActive("italic"))}
          aria-label="Italic"
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnCls(editor.isActive("bulletList"))}
          aria-label="Bullet list"
        >
          <List size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnCls(editor.isActive("orderedList"))}
          aria-label="Numbered list"
        >
          <ListOrdered size={14} />
        </button>
        <div className="w-px h-4 bg-outline-variant/40 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className={btnCls(false)}
          aria-label="Clear formatting"
        >
          <RemoveFormatting size={14} />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
