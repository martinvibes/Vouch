"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Scroll-choreography controller. Watches every `.reveal` in the document and
 * flips it to `.in` as it enters the viewport, so sections rise into place as
 * you scroll. Re-scans on navigation. Respects prefers-reduced-motion via CSS.
 */
export function Reveals() {
  const pathname = usePathname();

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.in)"));
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            const delay = el.dataset.delay;
            if (delay) el.style.transitionDelay = `${delay}ms`;
            el.classList.add("in");
            io.unobserve(el);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
