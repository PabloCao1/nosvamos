import type { ReactNode } from "react";

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "mint" | "warning" | "danger";
}) {
  return <span className={`status-pill status-${tone}`}>{children}</span>;
}
