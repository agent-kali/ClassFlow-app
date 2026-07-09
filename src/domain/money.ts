import type { FxRate } from "./types";

/**
 * The single place VND is derived from USD. VND figures are never stored,
 * never hardcoded — always usd × captured spot rate, rounded here.
 *
 * Rounding rule (applied app-wide): đồng amounts round to the nearest 1,000 ₫.
 */
const VND_ROUNDING = 1000;

export function usdToVnd(usd: number, rate: FxRate): number {
  return Math.round((usd * rate.vndPerUsd) / VND_ROUNDING) * VND_ROUNDING;
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Vietnamese grouping (dots), e.g. "471.000 ₫". */
const vndFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

export function formatUsd(usd: number): string {
  return usdFormatter.format(usd);
}

export function formatVnd(vnd: number): string {
  return `${vndFormatter.format(vnd)} ₫`;
}

/** The paired figure used everywhere money appears: "$18.00 · 470.000 ₫". */
export function formatMoneyPair(usd: number, rate: FxRate): { usd: string; vnd: string } {
  return { usd: formatUsd(usd), vnd: formatVnd(usdToVnd(usd, rate)) };
}

export function formatFxRate(rate: FxRate): string {
  return `${vndFormatter.format(rate.vndPerUsd)} ₫/$`;
}
