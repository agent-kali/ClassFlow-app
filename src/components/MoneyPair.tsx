"use client";

import { useFxRate } from "@/data/hooks";
import { formatUsd, formatVnd, usdToVnd } from "@/domain/money";

/**
 * The paired figure — a rate in dollars, a wage in dong — rendered together
 * everywhere money appears. VND is always derived here, never passed in.
 */
export function MoneyPair({
  usd,
  size = "md",
  align = "left",
  struck = false,
}: {
  usd: number;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right";
  struck?: boolean;
}) {
  const rate = useFxRate();
  const vnd = usdToVnd(usd, rate);
  const sizes = {
    sm: { usd: "text-xs", vnd: "text-[10px]" },
    md: { usd: "text-sm", vnd: "text-xs" },
    lg: { usd: "text-2xl font-semibold", vnd: "text-sm" },
  }[size];

  return (
    <span
      className={`cf-mono inline-flex flex-col leading-tight ${align === "right" ? "items-end" : "items-start"} ${struck ? "line-through decoration-danger/70 text-ink-faint" : ""}`}
    >
      <span className={sizes.usd}>{formatUsd(usd)}</span>
      <span className={`${sizes.vnd} ${struck ? "" : "text-ink-mute"}`}>{formatVnd(vnd)}</span>
    </span>
  );
}
