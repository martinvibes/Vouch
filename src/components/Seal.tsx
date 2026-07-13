"use client";

import { useId } from "react";
import type { GradeLetter } from "@/lib/types";
import { gradeColor } from "@/lib/grade";

/**
 * The Vouch Seal — the brand's signature object. A rosette/notary stamp: a
 * ring of radial teeth, concentric hairlines, "VOUCH · CERTIFIED · AGENT"
 * curved along the rim, and the agent's letter grade struck in the centre.
 * It's what a ratings authority issues — an actual seal of approval.
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

  const c = 120; // viewBox centre
  const rimR = 104; // text path radius
  const teeth = 60;
  const teethOuter = 116;
  const teethInner = 109;

  const teethLines = Array.from({ length: teeth }, (_, i) => {
    const a = (i / teeth) * Math.PI * 2;
    const x1 = c + teethInner * Math.cos(a);
    const y1 = c + teethInner * Math.sin(a);
    const x2 = c + teethOuter * Math.cos(a);
    const y2 = c + teethOuter * Math.sin(a);
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="var(--color-gold)"
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
      aria-label={`Vouch grade ${grade}`}
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
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="70%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Inner glow tinted by the grade */}
      <circle cx={c} cy={c} r="96" fill={`url(#glow-${uid})`} />

      {/* Rosette teeth ring (optionally rotating) */}
      <g
        className={spin ? "animate-spin-slow" : undefined}
        style={{ transformOrigin: "120px 120px" }}
      >
        {teethLines}
      </g>

      {/* Concentric hairlines */}
      <circle cx={c} cy={c} r="105" fill="none" stroke="var(--color-gold)" strokeWidth="1" opacity="0.5" />
      <circle cx={c} cy={c} r="92" fill="none" stroke="var(--color-gold)" strokeWidth="1.4" opacity="0.8" />
      <circle cx={c} cy={c} r="70" fill="none" stroke="var(--color-line-strong)" strokeWidth="1" />

      {/* Curved rim text */}
      <text
        fill="var(--color-gold)"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11.5px",
          fontWeight: 600,
          letterSpacing: "3.2px",
        }}
      >
        <textPath href={`#${pathId}`} startOffset="0%">
          VOUCH · CERTIFIED AGENT · VOUCH · CERTIFIED AGENT ·
        </textPath>
      </text>

      {/* Centre grade */}
      <text
        x={c}
        y={score !== undefined ? c - 2 : c + 6}
        textAnchor="middle"
        fill={color}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: grade.length > 1 ? "50px" : "62px",
          fontWeight: 700,
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
          fill="var(--color-fg-dim)"
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
          fill="var(--color-fg-mute)"
          style={{ fontFamily: "var(--font-mono)", fontSize: "8.5px", letterSpacing: "2px" }}
        >
          {subtitle.toUpperCase()}
        </text>
      )}
    </svg>
  );
}
