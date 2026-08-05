/**
 * Gatepath Realtors — Rotating Carousel (Phase 38)
 * Extracted from Hero.tsx's original inline interval logic so the same
 * "advance through a list of media on a timer, no-op for 0/1 items"
 * behavior is written once and shared with the Diaspora Hero.
 */
import { useEffect, useState } from "react";

export function useRotatingCarousel(itemCount: number, intervalMs = 6000) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (current >= itemCount) setCurrent(0);
  }, [itemCount, current]);

  useEffect(() => {
    if (itemCount <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === itemCount - 1 ? 0 : prev + 1));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [itemCount, intervalMs]);

  return current;
}
