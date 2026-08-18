/**
 * Gatepath Realtors — Document Vault Actions (Server Functions)
 *
 * File bytes never pass through the Cloudflare Worker: requestUploadUrlFn
 * issues a short-lived Supabase Storage signed UPLOAD url, and the browser
 * uploads directly to Storage using it (supabase-js's uploadToSignedUrl).
 * The `documents` bucket has no RLS policy on storage.objects at all —
 * every upload/download/delete is mediated by one of these server-verified
 * functions using the service role, never a direct client permission.
 *
 * Deletion is CEO/manager only (not agents) — these are often legally
 * significant records (title deeds, POAs, signed agreements), a stricter
 * gate than the routine-work default used for Tasks/Property-Matching,
 * matching the same elevated-stakes reasoning already used for CEO
 * e-signatures elsewhere in this codebase.
 */
import { createServerFn } from "@tanstack/react-start";
// Module 3 audit finding #8: this file's own verify-caller implementation
// is consolidated into src/lib/serverAuth.ts. The delete handler below
// keeps its own extra inline CEO/manager check on top of this — unchanged.
import { verifyStaffCaller } from "./serverAuth";
import { logAuditEvent } from "./auditLog";
import type { DocumentType } from "./types";

const BUCKET = "documents";
const SIGNED_URL_EXPIRY_SECONDS = 300;

export const requestDocumentUploadUrlFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; documentType: DocumentType; fileName: string }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyStaffCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false as const, error: caller.error };

    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${data.documentType}/${crypto.randomUUID()}-${safeName}`;

    const { data: uploadData, error } = await caller.serviceClient.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error || !uploadData) {
      return { success: false as const, error: error?.message ?? "Could not create upload URL." };
    }

    return {
      success: true as const,
      path: uploadData.path,
      token: uploadData.token,
      signedUrl: uploadData.signedUrl,
    };
  });

export const createDocumentRecordFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      storagePath: string;
      documentType: DocumentType;
      fileName: string;
      fileSizeBytes?: number;
      inquiryId?: string;
      notes?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const caller = await verifyStaffCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { error } = await caller.serviceClient.from("document_records").insert({
      inquiry_id: data.inquiryId || null,
      document_type: data.documentType,
      storage_path: data.storagePath,
      file_name: data.fileName,
      file_size_bytes: data.fileSizeBytes ?? null,
      notes: data.notes || null,
      uploaded_by_email: caller.caller.email,
      uploaded_by_name: caller.caller.full_name,
    });

    if (error) return { success: false, error: error.message };

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: "document.upload",
      entityType: "document_records",
      entityId: data.storagePath,
      details: { documentType: data.documentType, fileName: data.fileName },
    });

    return { success: true };
  });

export const getDocumentSignedUrlFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; documentId: string }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyStaffCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false as const, error: caller.error };

    const { data: record } = await caller.serviceClient
      .from("document_records")
      .select("storage_path")
      .eq("id", data.documentId)
      .maybeSingle();

    if (!record) return { success: false as const, error: "Document not found." };

    const { data: signed, error } = await caller.serviceClient.storage
      .from(BUCKET)
      .createSignedUrl(record.storage_path, SIGNED_URL_EXPIRY_SECONDS);

    if (error || !signed) {
      return { success: false as const, error: error?.message ?? "Could not sign URL." };
    }

    return { success: true as const, signedUrl: signed.signedUrl };
  });

export const deleteDocumentRecordFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; documentId: string }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyStaffCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };
    if (caller.caller.role !== "ceo" && caller.caller.role !== "manager") {
      return { success: false, error: "Only the CEO or a manager can delete vault documents." };
    }

    const { data: record } = await caller.serviceClient
      .from("document_records")
      .select("storage_path")
      .eq("id", data.documentId)
      .maybeSingle();

    if (!record) return { success: false, error: "Document not found." };

    await caller.serviceClient.storage.from(BUCKET).remove([record.storage_path]);
    const { error } = await caller.serviceClient
      .from("document_records")
      .delete()
      .eq("id", data.documentId);

    if (error) return { success: false, error: error.message };

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: "document.delete",
      entityType: "document_records",
      entityId: data.documentId,
    });

    return { success: true };
  });
