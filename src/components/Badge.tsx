import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type { School } from "@/domain/types";

export function schoolClass(school: School | undefined): string {
  return school ? `school-${school.color}` : "";
}

export type BadgeSize = "xs" | "sm" | "md";

/** Status, identity, and count tones — colors come from existing CSS vars only. */
export type BadgeTone =
  | "delivered"
  | "planned"
  | "cancelled"
  | "conflict"
  | "school"
  | "room"
  | "count";

export type BadgeCountKind = "danger" | "warn";

const SIZE: Record<BadgeSize, string> = {
  xs: "rounded-[2px] px-[3px] text-[9px] font-bold leading-[1.4]",
  sm: "rounded-sm px-1.5 py-px text-[10px] font-bold leading-tight",
  md: "rounded-sm px-1.5 py-0.5 text-[11px] font-semibold leading-tight",
};

function toneStyle(
  tone: BadgeTone,
  countKind: BadgeCountKind
): { className?: string; style?: CSSProperties } {
  switch (tone) {
    case "delivered":
      return { style: { background: "var(--accent-soft)", color: "var(--ok)" } };
    case "planned":
      return { className: "bg-accent text-accent-ink" };
    case "cancelled":
      return { style: { background: "var(--danger-soft)", color: "var(--danger)" } };
    case "conflict":
      return { style: { background: "var(--warn-soft)", color: "var(--warn)" } };
    case "school":
      return { style: { background: "var(--school-soft)", color: "var(--school)" } };
    case "room":
      return { className: "bg-line-soft text-ink" };
    case "count":
      return countKind === "warn"
        ? { style: { background: "var(--warn-soft)", color: "var(--warn)" } }
        : { style: { background: "var(--danger-soft)", color: "var(--danger)" } };
  }
}

/** Shared class string for Badge or Badge-styled controls (e.g. toolbar buttons). */
export function badgeClassName({
  size = "sm",
  tone,
  countKind = "danger",
  school,
  className = "",
}: {
  size?: BadgeSize;
  tone: BadgeTone;
  countKind?: BadgeCountKind;
  school?: School;
  className?: string;
}): string {
  const toneClasses = toneStyle(tone, countKind).className ?? "";
  const isIdentity = tone === "school" || tone === "room";
  const isCount = tone === "count";
  return [
    "cf-mono inline-flex max-w-none shrink-0 items-center whitespace-nowrap",
    isIdentity || isCount ? "font-semibold tracking-wide" : "uppercase tracking-wide",
    isCount ? "normal-case" : "",
    SIZE[size],
    tone === "school" ? schoolClass(school) : "",
    toneClasses,
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  size?: BadgeSize;
  tone: BadgeTone;
  children: ReactNode;
  /** Required for tone="school" — sets --school / --school-soft via school-* class. */
  school?: School;
  /** When tone="count", danger (default) or warn soft pair. */
  countKind?: BadgeCountKind;
}

/**
 * Unified badge for status, school, room, and count chips.
 * Size xs never truncates — parent tier logic must drop the badge whole.
 */
export function Badge({
  size = "sm",
  tone,
  children,
  school,
  countKind = "danger",
  className = "",
  style,
  title,
  ...rest
}: BadgeProps) {
  if (tone === "school" && !school) return null;

  const toneResolved = toneStyle(tone, countKind);
  const label =
    title ??
    (tone === "school" && school ? school.name : undefined);

  return (
    <span
      className={badgeClassName({ size, tone, countKind, school, className })}
      style={{ ...toneResolved.style, ...style }}
      title={label}
      {...rest}
    >
      {children}
    </span>
  );
}
