/**
 * Gatepath Realtors — Media Upload Actions (Server Functions)
 *
 * Mirrors documentVaultActions.ts's signed-upload-URL pattern for the
 * public `site-assets` bucket: requestMediaUploadUrlFn issues a short-lived
 * Supabase Storage signed UPLOAD url, the browser uploads directly to
 * Storage using it (supabase-js's uploadToSignedUrl), and file bytes never
 * pass through the Cloudflare Worker.
 *
 * Any staff role may upload — matches Document Vault's own upload gate.
 * The sensitive part is which screen lets you *save* the resulting URL,
 * and each of those already has its own real role gate that this doesn't
 * touch.
 */
import { createServerFn } from "@tanstack/react-start";
// Module 3 audit finding #8: this file's own verify-caller implementation
// is consolidated into src/lib/serverAuth.ts.
import { verifyStaffCaller } from "./serverAuth";

const BUCKET = "site-assets";

export const requestMediaUploadUrlFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; category: string; fileName: string }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyStaffCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false as const, error: caller.error };

    const safeCategory = data.category.replace(/[^a-zA-Z0-9_-]/g, "_") || "misc";
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${safeCategory}/${crypto.randomUUID()}-${safeName}`;

    const { data: uploadData, error } = await caller.serviceClient.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error || !uploadData) {
      return { success: false as const, error: error?.message ?? "Could not create upload URL." };
    }

    const { data: publicUrlData } = caller.serviceClient.storage.from(BUCKET).getPublicUrl(path);

    return {
      success: true as const,
      path: uploadData.path,
      token: uploadData.token,
      signedUrl: uploadData.signedUrl,
      publicUrl: publicUrlData.publicUrl,
    };
  });
