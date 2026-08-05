/**
 * Gatepath Realtors — shared image/video URL detection (Phase 38)
 * Extension-based, matches whatever the admin's own MediaDropzone accepts.
 * Shared between the admin uploader and every public-facing renderer so the
 * check isn't duplicated (and doesn't drift) across files.
 */
export function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(url);
}

export function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(url);
}
