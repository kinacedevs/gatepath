/**
 * Gatepath Realtors — Media Slide (Phase 38)
 * Shared image/video renderer for every public-facing gallery/carousel/cover
 * spot that used to be a plain <img>. Renders a muted, inline <video> when
 * the URL is a video (browsers generate a first-frame preview via
 * preload="metadata" with no extra work), otherwise the same <img> as
 * before — a drop-in replacement, not a new visual pattern.
 */
import { isVideoUrl } from "@/lib/media";

type MediaSlideProps = {
  src: string;
  alt: string;
  className?: string;
  autoPlay?: boolean;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "auto";
};

export function MediaSlide({
  src,
  alt,
  className,
  autoPlay = false,
  loading,
  fetchPriority,
}: MediaSlideProps) {
  if (isVideoUrl(src)) {
    return (
      <video
        src={src}
        className={className}
        muted
        playsInline
        preload="metadata"
        autoPlay={autoPlay}
        loop={autoPlay}
        controls={!autoPlay}
        aria-label={alt}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
    />
  );
}
