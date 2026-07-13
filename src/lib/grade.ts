import type { GradeLetter } from "./types";

/**
 * Score → letter grade. One published scale, applied identically to every
 * agent regardless of category or who's asking. The bands are deliberately
 * strict at the top: an "S" means Vouch would stake its own money on it.
 */
export function toGrade(score: number): GradeLetter {
  if (score >= 95) return "S";
  if (score >= 90) return "A+";
  if (score >= 82) return "A";
  if (score >= 70) return "B";
  if (score >= 58) return "C";
  if (score >= 45) return "D";
  return "F";
}

/** Certification threshold — the badge an agent can display and pay to re-earn. */
export const CERTIFY_THRESHOLD = 82; // grade A or better

export function isCertified(score: number): boolean {
  return score >= CERTIFY_THRESHOLD;
}

/** Which grade-scale colour family a grade belongs to (drives the CSS class). */
export function gradeClass(grade: GradeLetter): string {
  switch (grade) {
    case "S":
    case "A+":
    case "A":
      return "grade-a";
    case "B":
      return "grade-b";
    case "C":
      return "grade-c";
    case "D":
      return "grade-d";
    case "F":
      return "grade-f";
  }
}

/** Raw hex for the grade — used where inline colour is needed (charts, seal). */
export function gradeColor(grade: GradeLetter): string {
  switch (grade) {
    case "S":
    case "A+":
    case "A":
      return "#43d6a0";
    case "B":
      return "#5bc8d8";
    case "C":
      return "#e6b23c";
    case "D":
      return "#e8894a";
    case "F":
      return "#e5484d";
  }
}

export const GRADE_MEANING: Record<GradeLetter, string> = {
  S: "Exceptional. Vouch would stake capital on this agent.",
  "A+": "Excellent. Trust it with production work, unsupervised.",
  A: "Strong. Certified. Safe to hire for its stated category.",
  B: "Competent. Delivers, with rough edges worth watching.",
  C: "Mixed. Works sometimes; verify every deliverable.",
  D: "Weak. Frequent misses or poor value for the price.",
  F: "Failing. Did not deliver to spec. Avoid.",
};
