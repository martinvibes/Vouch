import type { GradeLetter } from "@/lib/types";
import { gradeClass } from "@/lib/grade";

/** The letter-grade chip. Size scales the box; the colour comes from the grade. */
export function GradeBadge({
  grade,
  size = "md",
}: {
  grade: GradeLetter;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const dims: Record<string, string> = {
    sm: "h-7 min-w-7 px-1.5 text-sm",
    md: "h-10 min-w-10 px-2 text-lg",
    lg: "h-14 min-w-14 px-3 text-2xl",
    xl: "h-20 min-w-20 px-4 text-4xl",
  };
  return (
    <span className={`grade ${gradeClass(grade)} ${dims[size]}`} aria-label={`Grade ${grade}`}>
      {grade}
    </span>
  );
}
