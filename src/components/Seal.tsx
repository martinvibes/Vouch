"use client";

import { useId } from "react";
import type { GradeLetter } from "@/lib/types";
import { gradeColor } from "@/lib/grade";

/**
 * The Vouch Seal — the brand's signature object. A notary rosette: a ring of
 * radial teeth, concentric hairlines, "VOUCH · CERTIFIED AGENT" curved along the
 * rim, and the agent's letter grade struck in the centre. It's what a ratings
 * authority issues — an actual seal of approval, in the grade's own colour.
 */
export function Seal({
  grade,
  score,
  size = 240,
  subtitle,
  animate = false,
  spin = false,
}: {
  grade: GradeLetter;
  score?: number;
  size?: number;
  subtitle?: string;
  animate?: boolean;
  spin?: boolean;
}) {
  const uid = useId().replace(/[:]/g, "");
  const pathId = `seal-rim-${uid}`;
  const color = gradeColor(grade);

  const c = 120;
  const rimR = 104;
  const teeth = 60;
  const teethOuter = 116;
  const teethInner = 109;

  // Round trig output to a fixed precision so the server (Node) and client
  // (browser) serialize identical coordinate strings — otherwise last-ULP
  // float differences trigger an SVG hydration mismatch.
  const p = (n: number) => Math.round(n * 1000) / 1000;
  const teethLines = Array.from({ length: teeth }, (_, i) => {
    const a = (i / teeth) * Math.PI * 2;
    return (
      <line
        key={i}
        x1={p(c + teethInner * Math.cos(a))}
        y1={p(c + teethInner * Math.sin(a))}
        x2={p(c + teethOuter * Math.cos(a))}
        y2={p(c + teethOuter * Math.sin(a))}
        stroke="var(--gold)"
        strokeWidth={i % 5 === 0 ? 2.4 : 1.2}
        strokeLinecap="round"
        opacity={0.9}
      />
    );
  });

  return (
    <svg
      viewBox="0 0 240 240"
      width={size}
      height={size}
      role="img"
      aria-label={`Vouch grade ${grade}${score !== undefined ? `, ${score} out of 100` : ""}`}
      className={animate ? "animate-stamp" : undefined}
      style={{ overflow: "visible" }}
    >
      <defs>
        <path
          id={pathId}
          d={`M ${c},${c} m -${rimR},0 a ${rimR},${rimR} 0 1,1 ${rimR * 2},0 a ${rimR},${rimR} 0 1,1 -${rimR * 2},0`}
          fill="none"
        />
        <radialGradient id={`glow-${uid}`} cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="0.24" />
          <stop offset="70%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={c} cy={c} r="96" fill={`url(#glow-${uid})`} />

      <g className={spin ? "animate-spin-slow" : undefined} style={{ transformOrigin: "120px 120px" }}>
        {teethLines}
      </g>

      <circle cx={c} cy={c} r="105" fill="none" stroke="var(--gold)" strokeWidth="1" opacity="0.5" />
      <circle cx={c} cy={c} r="92" fill="none" stroke="var(--gold)" strokeWidth="1.4" opacity="0.85" />
      <circle cx={c} cy={c} r="70" fill="none" stroke="var(--line-strong)" strokeWidth="1" />

      <text
        fill="var(--gold-3)"
        style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", fontWeight: 600, letterSpacing: "3.2px" }}
      >
        <textPath href={`#${pathId}`} startOffset="0%">
          VOUCH · CERTIFIED AGENT · VOUCH · CERTIFIED AGENT ·
        </textPath>
      </text>

      <text
        x={c}
        y={score !== undefined ? c - 2 : c + 6}
        textAnchor="middle"
        fill={color}
        style={{
          fontFamily: "var(--font-display)",
          fontSize: grade.length > 1 ? "50px" : "64px",
          fontWeight: 800,
          letterSpacing: "-2px",
        }}
      >
        {grade}
      </text>

      {score !== undefined && (
        <text
          x={c}
          y={c + 30}
          textAnchor="middle"
          fill="var(--ink-soft)"
          style={{ fontFamily: "var(--font-mono)", fontSize: "13px", letterSpacing: "1px" }}
        >
          {score}/100
        </text>
      )}

      {subtitle && (
        <text
          x={c}
          y={c + 50}
          textAnchor="middle"
          fill="var(--ink-mute)"
          style={{ fontFamily: "var(--font-mono)", fontSize: "8.5px", letterSpacing: "2px" }}
        >
          {subtitle.toUpperCase()}
        </text>
      )}
    </svg>
  );
}
