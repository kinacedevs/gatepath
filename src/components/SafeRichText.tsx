/**
 * Gatepath Realtors — Safe Rich Text renderer (Phase 40D)
 * Renders HTML produced exclusively by the admin RichTextEditor
 * (src/components/admin/RichTextEditor.tsx) — never a public-submission
 * field. This is the first use of dangerouslySetInnerHTML in this
 * codebase; deliberately isolated to this one component so the trust
 * boundary (staff-authored only) is explicit and auditable in one place.
 */
export function SafeRichText({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={`leading-[1.75] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_p]:mb-3 [&_li]:mb-1 [&_strong]:font-bold [&_em]:italic ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
