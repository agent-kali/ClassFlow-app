import { en } from "./en";
import { vi } from "./vi";
import type { LandingCopy } from "./types";
import type { Locale } from "../locale";

export type { LandingCopy } from "./types";

export const landingCopy: Record<Locale, LandingCopy> = { en, vi };

export function getLandingCopy(locale: Locale): LandingCopy {
  return landingCopy[locale];
}
