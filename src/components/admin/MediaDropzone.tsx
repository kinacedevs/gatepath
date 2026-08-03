/**
 * Gatepath Realtors — Media Dropzone (Phase 36)
 *
 * Replaces raw-URL `<input>`/`<textarea>` media fields across the admin
 * with a real drag-and-drop / click-to-browse upload widget. Uploads go
 * straight from the browser to the `site-assets` Storage bucket via a
 * server-issued signed URL (src/lib/mediaUploadActions.ts) — file bytes
 * never touch the Cloudflare Worker, same reasoning as Document Vault.
 *
 * Multi mode renders a vertical, drag-to-reorder list (@dnd-kit/sortable)
 * so multi-image fields read the same way the public site's own stacked
 * hero-image carousel does. A de-emphasized "paste a URL" fallback stays
 * available in both modes — low-risk resilience, not the primary path.
 *
 * Stateless about *where* the resulting URL is saved — the parent
 * screen's existing save handler and role gate persist it exactly as
 * before; this component only ever calls onChange.
 */
import { useRef, useState, type DragEvent } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Upload, X, Link2, Loader2, ImageOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { requestMediaUploadUrlFn } from "@/lib/mediaUploadActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BUCKET = "site-assets";
const MAX_FILE_BYTES = 8 * 1024 * 1024;

type MediaDropzoneProps = {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multi?: boolean;
  accept?: string;
  category: string;
  label?: string;
};

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(url);
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function uploadFile(file: File, category: string): Promise<{ url?: string; error?: string }> {
  if (file.size > MAX_FILE_BYTES) {
    return { error: "File is too large (max 8MB)." };
  }
  const accessToken = await getAccessToken();
  if (!accessToken) return { error: "Your session expired — please sign in again." };

  const urlResult = await requestMediaUploadUrlFn({
    data: { callerAccessToken: accessToken, category, fileName: file.name },
  });
  if (!urlResult.success) return { error: urlResult.error };

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(urlResult.path, urlResult.token, file);
  if (uploadErr) return { error: uploadErr.message };

  return { url: urlResult.publicUrl };
}

function MediaThumb({ url, className = "" }: { url: string; className?: string }) {
  return (
    <div
      className={`rounded-md overflow-hidden bg-surface-container-low shrink-0 flex items-center justify-center ${className}`}
    >
      {isImageUrl(url) ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <ImageOff size={18} className="text-on-surface-variant" />
      )}
    </div>
  );
}

function SortableRow({ id, url, onRemove }: { id: string; url: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-2 rounded-lg border border-outline-variant/30 bg-white"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-on-surface-variant touch-none shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>
      <MediaThumb url={url} className="w-14 h-14" />
      <span className="flex-1 min-w-0 truncate text-[12px] text-on-surface-variant">{url}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-error hover:opacity-70 shrink-0"
        aria-label="Remove"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function MediaDropzone({
  value,
  onChange,
  multi = false,
  accept = "image/*",
  category,
  label,
}: MediaDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const urls = multi ? ((value as string[]) ?? []) : value ? [value as string] : [];

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const result = await uploadFile(file, category);
      if (result.error) {
        setError(result.error);
        break;
      }
      if (result.url) uploaded.push(result.url);
      if (!multi) break;
    }
    if (uploaded.length > 0) {
      onChange(multi ? [...urls, ...uploaded] : uploaded[0]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (index: number) => {
    onChange(multi ? urls.filter((_, i) => i !== index) : "");
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = urls.findIndex((_, i) => `${category}-${i}` === active.id);
    const newIndex = urls.findIndex((_, i) => `${category}-${i}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(urls, oldIndex, newIndex));
  };

  const addUrlDraft = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    onChange(multi ? [...urls, trimmed] : trimmed);
    setUrlDraft("");
    setShowUrlInput(false);
  };

  const showDropzone = multi || urls.length === 0;

  return (
    <div className="space-y-2">
      {label && <p className="text-[12px] font-semibold text-on-surface-variant">{label}</p>}

      {multi && urls.length > 0 && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext
            items={urls.map((_, i) => `${category}-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {urls.map((url, i) => (
                <SortableRow
                  key={`${category}-${i}`}
                  id={`${category}-${i}`}
                  url={url}
                  onRemove={() => handleRemove(i)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {!multi && urls.length > 0 && (
        <div className="flex items-center gap-3 p-2 rounded-lg border border-outline-variant/30 bg-white">
          <MediaThumb url={urls[0]} className="w-16 h-16" />
          <span className="flex-1 min-w-0 truncate text-[12px] text-on-surface-variant">
            {urls[0]}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Replace
          </Button>
          <button
            type="button"
            onClick={() => handleRemove(0)}
            className="text-error hover:opacity-70 shrink-0"
            aria-label="Remove"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {showDropzone && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-outline-variant/40 hover:border-primary/50"
          }`}
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin text-primary" />
          ) : (
            <Upload size={20} className="text-on-surface-variant" />
          )}
          <p className="text-[12px] text-on-surface-variant">
            {uploading ? "Uploading…" : "Drag & drop or click to upload"}
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multi}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-[12px] text-error">{error}</p>}

      {showUrlInput ? (
        <div className="flex items-center gap-2">
          <Input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://..."
            className="text-[12px] h-8"
          />
          <Button type="button" size="sm" variant="outline" onClick={addUrlDraft}>
            Add
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowUrlInput(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowUrlInput(true)}
          className="inline-flex items-center gap-1 text-[11px] text-on-surface-variant hover:text-primary"
        >
          <Link2 size={11} /> or paste a URL
        </button>
      )}
    </div>
  );
}
