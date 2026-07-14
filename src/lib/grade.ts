import type { GradeLetter } from "./types";

/**
 * Score → letter grade. One published scale, applied identically to every
 * agent. Deliberately strict at the top: an "S" means the agent is proven on
 * real settled jobs AND scores near-perfect on every signal.
 */
export function toGrade(score: number): GradeLetter {
  if (score >= 92) return "S";
  if (score >= 80) return "A";
  if (score >= 66) return "B";
  if (score >= 52) return "C";
  if (score >= 38) return "D";
  return "F";
}

/** Certification threshold — grade A or better (and proven). */
export const CERTIFY_THRESHOLD = 80;

export function isCertified(score: number): boolean {
  return score >= CERTIFY_THRESHOLD;
}

/** Grade → CSS grade class (drives the semantic colour). */
export function gradeClass(grade: GradeLetter): string {
  return `grade-${grade.toLowerCase()}`;
}

/** Grade → theme-aware CSS colour token (for inline SVG / charts). */
export function gradeColor(grade: GradeLetter): string {
  return `var(--grade-${grade.toLowerCase()})`;
}

export const GRADE_MEANING: Record<GradeLetter, string> = {
  S: "Exceptional. Proven on real jobs and near-perfect on every signal.",
  A: "Strong. Certified — safe to hire for its stated services.",
  B: "Competent. Delivers, with signals worth watching.",
  C: "Mixed. Some positive signals; verify before you rely on it.",
  D: "Weak. Thin track record or poor signals for the price.",
  F: "Failing. Offline, unsafe, or no credible signals. Avoid.",
};
