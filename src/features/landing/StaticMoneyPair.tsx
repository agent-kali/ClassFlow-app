import { formatMoneyPair } from "@/domain/money";
import type { FxRate } from "@/domain/types";

/** Landing-only money pair — does not touch the live store. */
export function StaticMoneyPair({
  usd,
  rate,
  size = "md",
  struck = false,
}: {
  usd: number;
  rate: FxRate;
  size?: "sm" | "md" | "lg";
  struck?: boolean;
}) {
  const { usd: usdLabel, vnd } = formatMoneyPair(usd, rate);
  const sizes = {
    sm: { usd: "text-xs", vnd: "text-[10px]" },
    md: { usd: "text-sm", vnd: "text-xs" },
    lg: { usd: "text-xl font-semibold", vnd: "text-sm" },
  }[size];

  return (
    <span
      className={`cf-mono inline-flex flex-col leading-tight ${struck ? "text-ink-faint line-through decoration-danger/70" : ""}`}
    >
      <span className={sizes.usd}>{usdLabel}</span>
      <span className={`${sizes.vnd} ${struck ? "" : "text-ink-mute"}`}>{vnd}</span>
    </span>
  );
}
