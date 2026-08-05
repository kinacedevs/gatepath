/**
 * Gatepath Realtors — Document Vault (Part 2, Module 7)
 * First real file-upload capability in this codebase. Upload flow: request
 * a short-lived Supabase Storage signed upload URL from the server
 * (requestDocumentUploadUrlFn), upload the file directly to Storage from
 * the browser (bypassing the Cloudflare Worker entirely), then record the
 * metadata (createDocumentRecordFn). Viewing/downloading uses a signed
 * read URL generated on demand (getDocumentSignedUrlFn) — nothing is ever
 * publicly accessible. Deletion is CEO/manager only, enforced server-side;
 * the delete button is hidden for agents here as a UI-level courtesy, not
 * the real enforcement.
 *
 * Buyer/client-facing access to their own documents is explicitly deferred
 * to Module 8 (Buyer/Client Portal expansion) — this screen is staff-only.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  FolderLock,
  FileText,
  Link2,
  Eye,
  Trash2,
  Loader2,
  CalendarDays,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import {
  requestDocumentUploadUrlFn,
  createDocumentRecordFn,
  getDocumentSignedUrlFn,
  deleteDocumentRecordFn,
} from "@/lib/documentVaultActions";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { CategoryBarChart } from "@/components/admin/charts/CategoryBarChart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { DocumentRecord, DocumentType, Inquiry } from "@/lib/types";

export const Route = createFileRoute("/admin/documents")({
  component: DocumentVault,
});

const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  agreement: "Agreement",
  offer: "Offer Letter",
  receipt: "Receipt",
  title_deed: "Title Deed",
  id_copy: "ID Copy",
  poa: "Power of Attorney",
  other: "Other",
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentVault() {
  const { adminRole } = useAdminSession();
  const canDelete = adminRole === "ceo" || adminRole === "manager";

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [actionState, setActionState] = useState<Record<string, boolean>>({});

  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>("title_deed");
  const [linkedInquiryId, setLinkedInquiryId] = useState("");
  const [notes, setNotes] = useState("");
  const [uploadSaving, setUploadSaving] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    const [documentsRes, inquiriesRes] = await Promise.all([
      supabase.from("document_records").select("*").order("created_at", { ascending: false }),
      supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (documentsRes.error) {
      setUnavailable(true);
    } else {
      setDocuments((documentsRes.data as DocumentRecord[]) ?? []);
    }
    setInquiries((inquiriesRes.data as Inquiry[]) ?? []);
    setLoading(false);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalDocuments = documents.length;
  const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const documentsThisMonth = documents.filter((d) => d.created_at.slice(0, 7) === monthKey).length;
  const linkedCount = documents.filter((d) => d.inquiry_id).length;

  const byType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of documents) {
      const label = DOCUMENT_TYPE_LABEL[d.document_type];
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [documents]);

  const inquiryById = useMemo(() => new Map(inquiries.map((i) => [i.id, i])), [inquiries]);

  const getAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token;
  };

  const openUpload = () => {
    setDocumentType("title_deed");
    setLinkedInquiryId("");
    setNotes("");
    setUploadMsg(null);
    setUploading(true);
  };

  const submitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setUploadMsg("Choose a file first.");
      return;
    }
    setUploadSaving(true);
    setUploadMsg(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setUploadMsg("Your session expired — please sign in again.");
        return;
      }

      const urlResult = await requestDocumentUploadUrlFn({
        data: { callerAccessToken: accessToken, documentType, fileName: file.name },
      });
      if (!urlResult.success) {
        setUploadMsg("Error preparing upload: " + urlResult.error);
        return;
      }

      const { error: uploadErr } = await supabase.storage
        .from("documents")
        .uploadToSignedUrl(urlResult.path, urlResult.token, file);
      if (uploadErr) {
        setUploadMsg("Error uploading file: " + uploadErr.message);
        return;
      }

      const recordResult = await createDocumentRecordFn({
        data: {
          callerAccessToken: accessToken,
          storagePath: urlResult.path,
          documentType,
          fileName: file.name,
          fileSizeBytes: file.size,
          inquiryId: linkedInquiryId || undefined,
          notes: notes.trim() || undefined,
        },
      });
      if (!recordResult.success) {
        setUploadMsg("File uploaded, but saving the record failed: " + recordResult.error);
      } else {
        setUploading(false);
        loadData();
      }
    } catch (err: any) {
      setUploadMsg("Something went wrong uploading: " + (err?.message || "Unknown error."));
    } finally {
      setUploadSaving(false);
    }
  };

  const viewDocument = async (documentId: string) => {
    setActionState((s) => ({ ...s, [documentId]: true }));
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        alert("Your session expired — please sign in again.");
        return;
      }
      const result = await getDocumentSignedUrlFn({
        data: { callerAccessToken: accessToken, documentId },
      });
      if (result.success) {
        window.open(result.signedUrl, "_blank", "noopener,noreferrer");
      } else {
        alert("Error opening document: " + result.error);
      }
    } catch (err: any) {
      alert("Something went wrong opening the document: " + (err?.message || "Unknown error."));
    } finally {
      setActionState((s) => ({ ...s, [documentId]: false }));
    }
  };

  const removeDocument = async (documentId: string) => {
    if (!confirm("Delete this document permanently? This cannot be undone.")) return;
    setActionState((s) => ({ ...s, [documentId]: true }));
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        alert("Your session expired — please sign in again.");
        return;
      }
      const result = await deleteDocumentRecordFn({
        data: { callerAccessToken: accessToken, documentId },
      });
      if (!(result as any)?.success) {
        alert("Error deleting document: " + ((result as any)?.error ?? "Unknown error."));
      }
      await loadData();
    } catch (err: any) {
      alert("Something went wrong deleting the document: " + (err?.message || "Unknown error."));
    } finally {
      setActionState((s) => ({ ...s, [documentId]: false }));
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Document Vault
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Agreements, title deeds, IDs, and POAs — stored securely, accessed via signed, expiring
            links.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FreshnessStamp updatedAt={lastUpdated} />
          <button
            onClick={openUpload}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-accent rounded-lg text-white font-bold text-[13px]"
          >
            <Plus size={14} /> Upload Document
          </button>
        </div>
      </div>

      {unavailable ? (
        <SectionCard>
          <p className="text-sm text-on-surface-variant italic">
            Document Vault unavailable — migration 0011 may not be applied yet.
          </p>
        </SectionCard>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              label="Total Documents"
              value={loading ? "…" : String(totalDocuments)}
              icon={FolderLock}
            />
            <KpiCard
              label="Documents This Month"
              value={loading ? "…" : String(documentsThisMonth)}
              icon={CalendarDays}
            />
            <KpiCard
              label="Linked to an Inquiry"
              value={loading ? "…" : `${linkedCount} of ${totalDocuments}`}
              icon={Link2}
            />
          </div>

          <SectionCard title="Documents by Type">
            {loading ? (
              <Skeleton className="h-45 rounded-xl" />
            ) : byType.length === 0 ? (
              <EmptyState title="No documents yet" />
            ) : (
              <CategoryBarChart data={byType} xKey="name" yKey="value" height={200} horizontal />
            )}
          </SectionCard>

          <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
            <div className="px-6 py-4 border-b border-outline-variant/30">
              <h2 className="font-headline-md text-sm text-primary font-bold">All Documents</h2>
            </div>
            {loading ? (
              <div className="p-6 flex flex-col gap-3">
                <Skeleton className="h-14 rounded-lg" />
                <Skeleton className="h-14 rounded-lg" />
              </div>
            ) : documents.length === 0 ? (
              <EmptyState icon={FileText} title="No documents uploaded yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-surface-container-low border-b border-outline-variant/30">
                    <tr>
                      {[
                        "Type",
                        "File",
                        "Linked Client",
                        "Uploaded By",
                        "Date",
                        "Size",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 font-label-md text-[11px] text-on-surface-variant uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {documents.map((doc) => {
                      const inquiry = doc.inquiry_id ? inquiryById.get(doc.inquiry_id) : undefined;
                      const busy = actionState[doc.id];
                      return (
                        <tr key={doc.id}>
                          <td className="px-4 py-3 text-[13px] font-semibold text-primary-container">
                            {DOCUMENT_TYPE_LABEL[doc.document_type]}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-on-surface truncate max-w-50">
                            {doc.file_name}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-on-surface-variant">
                            {inquiry?.client_full_name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-on-surface-variant">
                            {doc.uploaded_by_name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-on-surface-variant">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-on-surface-variant">
                            {formatFileSize(doc.file_size_bytes)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5">
                              <button
                                disabled={busy}
                                onClick={() => viewDocument(doc.id)}
                                title="View (signed link, expires in 5 minutes)"
                                className="p-1.5 border border-outline-variant/40 rounded-md bg-white text-on-surface-variant disabled:opacity-50"
                              >
                                {busy ? (
                                  <Loader2 size={13} className="animate-spin" />
                                ) : (
                                  <Eye size={13} />
                                )}
                              </button>
                              {canDelete && (
                                <button
                                  disabled={busy}
                                  onClick={() => removeDocument(doc.id)}
                                  title="Delete"
                                  className="p-1.5 border border-outline-variant/40 rounded-md bg-white text-error disabled:opacity-50"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════ MODAL: UPLOAD DOCUMENT ══════ */}
      <Dialog open={uploading} onOpenChange={(open) => !open && setUploading(false)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitUpload} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
              >
                {(Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[]).map((t) => (
                  <option key={t} value={t}>
                    {DOCUMENT_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                Link to Inquiry (optional)
              </label>
              <select
                value={linkedInquiryId}
                onChange={(e) => setLinkedInquiryId(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
              >
                <option value="">-- Not linked --</option>
                {inquiries.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.client_full_name} — {i.phase_name} #{i.plot_number_ref}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                required
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none resize-y"
              />
            </div>
            {uploadMsg && <p className="text-xs text-error">{uploadMsg}</p>}
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setUploading(false)}
                className="px-4 py-2 rounded-lg border border-outline-variant/40 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadSaving}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
              >
                {uploadSaving ? "Uploading…" : "Upload"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
