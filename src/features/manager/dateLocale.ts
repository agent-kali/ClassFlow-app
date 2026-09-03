import { enUS, vi as viDates } from "date-fns/locale";
import type { Locale } from "@/features/landing/locale";

export function managerDateLocale(locale: Locale) {
  return locale === "vi" ? viDates : enUS;
}
