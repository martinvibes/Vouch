"use client";

import { useState } from "react";

/**
 * Agent avatar with a graceful fallback. Marketplace avatars live on the OKX
 * CDN; when one is missing or fails to load we stamp the agent's initial into a
 * gold-tinted tile so the board never shows a broken image.
 */
export function AgentAvatar({
  name,
  url,
  size = 40,
  className = "",
}: {
  name: string;
  url: string | null;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const initial = (name.trim()[0] || "?").toUpperCase();
  const radius = Math.max(8, Math.round(size * 0.26));

  const box: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    flexShrink: 0,
  };

  if (!url || broken) {
    return (
      <span
        className={`grid place-items-center border border-line-strong bg-gold-tint font-display font-bold text-gold-3 ${className}`}
        style={{ ...box, fontSize: size * 0.42 }}
        aria-hidden
      >
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setBroken(true)}
      className={`border border-line object-cover ${className}`}
      style={box}
    />
  );
}
