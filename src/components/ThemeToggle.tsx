"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/**
 * Light/dark switch. Persists the choice to localStorage (read pre-paint by the
 * inline script in layout.tsx) and flips `data-theme` on <html>. Defaults to the
 * system preference until the user makes a choice.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("vouch-theme") as Theme | null;
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(saved ?? system);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("vouch-theme", next);
    } catch {}
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="relative grid h-10 w-10 place-items-center rounded-[12px] border border-line-strong text-ink transition-colors hover:border-gold-3 hover:text-gold"
    >
      {/* Sun / moon crossfade; suppressed until mounted to avoid a flash */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ opacity: theme === null ? 0 : 1 }}>
        {isDark ? (
          <path
            d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        ) : (
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none" />
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i / 8) * Math.PI * 2;
              const p = (n: number) => Math.round(n * 1000) / 1000;
              return (
                <line
                  key={i}
                  x1={p(12 + 7.2 * Math.cos(a))}
                  y1={p(12 + 7.2 * Math.sin(a))}
                  x2={p(12 + 9.4 * Math.cos(a))}
                  y2={p(12 + 9.4 * Math.sin(a))}
                />
              );
            })}
          </g>
        )}
      </svg>
    </button>
  );
}
