"use client";

import { format, parseISO } from "date-fns";
import { useLocale } from "@/features/landing/locale";
import { getManagerCopy } from "./copy";
import { managerDateLocale } from "./dateLocale";
import type { DayMarker } from "./dayViewState";

interface Props {
  markers: DayMarker[];
  selected: string;
  today: string;
  onSelect: (date: string) => void;
}

/**
 * The week's shape above the day it opens onto — a timetable header rather
 * than a row of chips. Each tab carries its lesson count and, when the day
 * holds a problem, a small marker that is never colour alone.
 */
export function DayDateStrip({ markers, selected, today, onSelect }: Props) {
  const [locale] = useLocale();
  const copy = getManagerCopy(locale);
  const dateLocale = managerDateLocale(locale);
  const issueLabel = {
    overlap: copy.doubleBooking,
    travel: copy.travelGap,
  } as const;

  return (
    <div className="day-strip" role="tablist" aria-label={copy.dayOfWeek}>
      {markers.map((marker) => {
        const d = parseISO(marker.date);
        const isSelected = marker.date === selected;
        const issue = marker.issue ? issueLabel[marker.issue] : null;
        return (
          <button
            key={marker.date}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-label={copy.dayTabAria(
              format(d, "EEEE d MMMM", { locale: dateLocale }),
              marker.count,
              issue
            )}
            className="day-strip__tab"
            data-selected={isSelected || undefined}
            data-today={marker.date === today || undefined}
            data-issue={marker.issue ?? undefined}
            onClick={() => onSelect(marker.date)}
          >
            <span className="day-strip__weekday cf-mono">
              {format(d, "EEE", { locale: dateLocale })}
            </span>
            <span className="day-strip__date cf-mono">
              {format(d, "d MMM", { locale: dateLocale })}
            </span>
            <span className="day-strip__count cf-mono">
              {marker.count === 0 ? "—" : marker.count}
            </span>
            {marker.issue && <span className="day-strip__issue" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
