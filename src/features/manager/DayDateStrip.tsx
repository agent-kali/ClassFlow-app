"use client";

import { format, parseISO } from "date-fns";
import type { DayMarker } from "./dayViewState";

interface Props {
  markers: DayMarker[];
  selected: string;
  today: string;
  onSelect: (date: string) => void;
}

const ISSUE_LABEL: Record<string, string> = {
  overlap: "double-booking",
  travel: "tight travel gap",
};

/**
 * The week's shape above the day it opens onto — a timetable header rather
 * than a row of chips. Each tab carries its lesson count and, when the day
 * holds a problem, a small marker that is never colour alone.
 */
export function DayDateStrip({ markers, selected, today, onSelect }: Props) {
  return (
    <div className="day-strip" role="tablist" aria-label="Day of week">
      {markers.map((marker) => {
        const d = parseISO(marker.date);
        const isSelected = marker.date === selected;
        const issue = marker.issue ? ISSUE_LABEL[marker.issue] : null;
        return (
          <button
            key={marker.date}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-label={
              `${format(d, "EEEE d MMMM")}, ${marker.count} lesson${marker.count === 1 ? "" : "s"}` +
              (issue ? `, has a ${issue}` : "")
            }
            className="day-strip__tab"
            data-selected={isSelected || undefined}
            data-today={marker.date === today || undefined}
            data-issue={marker.issue ?? undefined}
            onClick={() => onSelect(marker.date)}
          >
            <span className="day-strip__weekday cf-mono">{format(d, "EEE")}</span>
            <span className="day-strip__date cf-mono">{format(d, "d MMM")}</span>
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
