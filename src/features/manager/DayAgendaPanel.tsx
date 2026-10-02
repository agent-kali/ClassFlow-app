"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Lesson } from "@/domain/types";
import type { Conflict } from "@/domain/conflicts";
import type { useLookups } from "@/data/hooks";
import { formatAgendaMin } from "@/domain/time";
import { useLocale } from "@/features/landing/locale";
import { TOUR_BLOCK_ALL_LESSONS } from "@/features/tour/lessonLock";
import {
  agendaStatusTexts,
  buildDayAgenda,
  programLevelOf,
  type AgendaStatus,
  type DayAgendaItem,
} from "./dayAgenda";
import { getManagerCopy, type ManagerChromeCopy } from "./copy";
import { scrollGroupWithin } from "./scrollWithin";

interface Props {
  lessons: Lesson[];
  date: string;
  teacherIds: string[];
  lookups: ReturnType<typeof useLookups>;
  conflictsByLesson: Map<string, Conflict[]>;
  focusedLessonIds?: string[] | null;
  focusNonce?: number;
  selectedLessonId?: string | null;
  lockLessonSelection?: string | null;
  onSelectLesson?: (lesson: Lesson, el: HTMLElement) => void;
}

function statusLabels(copy: ManagerChromeCopy) {
  return {
    cancelled: copy.cancelledCard,
    noShow: copy.noShowCard,
    doubleBooking: copy.doubleBookingCard,
    tightTravel: copy.tightTravelCard,
  };
}

function itemLabel(item: DayAgendaItem, copy: ManagerChromeCopy, selected: boolean): string {
  const where = [item.campusName, item.roomName].filter(Boolean).join(", ");
  return [
    item.groupCode || copy.lessonFallback,
    `${formatAgendaMin(item.lesson.startMin)}–${formatAgendaMin(item.lesson.endMin)}`,
    item.programLevel,
    item.teacherName,
    where,
    ...agendaStatusTexts(item.statuses, statusLabels(copy)),
    selected ? copy.selected : "",
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * The day's lessons in reading order. Each row is a button so keyboard and
 * pointer selection share one path into the existing popover.
 */
export function DayAgenda({
  lessons,
  date,
  teacherIds,
  lookups,
  conflictsByLesson,
  focusedLessonIds = null,
  focusNonce = 0,
  selectedLessonId = null,
  lockLessonSelection = null,
  onSelectLesson,
}: Props) {
  const [locale] = useLocale();
  const copy = getManagerCopy(locale);
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () =>
      buildDayAgenda(lessons, date, teacherIds, conflictsByLesson, {
        groupCode: (id) => lookups.classGroupsById.get(id)?.code,
        programLevel: (id) => {
          const group = lookups.classGroupsById.get(id);
          return group ? programLevelOf(group.program, group.level) : undefined;
        },
        teacherName: (id) => lookups.teachersById.get(id)?.name,
        campusName: (roomId) => lookups.campusOfRoom(roomId)?.name,
        roomName: (roomId) => lookups.roomsById.get(roomId)?.name,
      }),
    [lessons, date, teacherIds, conflictsByLesson, lookups]
  );

  const focusedIds = useMemo(
    () => (focusedLessonIds ? new Set(focusedLessonIds) : null),
    [focusedLessonIds]
  );

  useEffect(() => {
    if (!focusedLessonIds?.length || focusNonce === 0) return;
    const timer = window.setTimeout(() => {
      const container = listRef.current;
      if (!container) return;
      const nodes = focusedLessonIds.flatMap((id) => {
        const el = container.querySelector(`[data-lesson-id="${CSS.escape(id)}"]`);
        return el instanceof HTMLElement ? [el] : [];
      });
      scrollGroupWithin(container, nodes, { top: 4, bottom: 4 });
    }, 30);
    return () => clearTimeout(timer);
  }, [focusedLessonIds, focusNonce]);

  const select = (lesson: Lesson, el: HTMLElement) => {
    if (!onSelectLesson) return;
    if (lockLessonSelection === TOUR_BLOCK_ALL_LESSONS) return;
    if (lockLessonSelection && lesson.id !== lockLessonSelection) return;
    onSelectLesson(lesson, el);
  };

  return (
    <section className="day-agenda" aria-label={copy.dayAgendaAria}>
      <h2 className="day-agenda__title">{copy.dayAgendaTitle}</h2>
      <div ref={listRef} className="day-agenda__list">
        {teacherIds.length === 0 ? (
          <p className="day-agenda__empty">{copy.noTeachersSelected}</p>
        ) : items.length === 0 ? (
          <p className="day-agenda__empty">{copy.noLessons}</p>
        ) : (
          items.map((item) => {
            const selected = selectedLessonId === item.lesson.id;
            const focused = focusedIds?.has(item.lesson.id) ?? false;
            const hasConflict = item.statuses.some((status) => status.kind === "double-booking");
            const hasTravel = item.statuses.some((status) => status.kind === "tight-travel");
            const off = item.statuses.find(
              (status): status is Extract<AgendaStatus, { kind: "cancelled" | "no-show" }> =>
                status.kind === "cancelled" || status.kind === "no-show"
            );
            const time = `${formatAgendaMin(item.lesson.startMin)}–${formatAgendaMin(item.lesson.endMin)}`;
            return (
              <button
                key={item.lesson.id}
                type="button"
                className="day-agenda__item"
                data-lesson-id={item.lesson.id}
                data-selected={selected || undefined}
                data-focused={focused || undefined}
                data-conflict={hasConflict || undefined}
                data-travel={hasTravel || undefined}
                data-status={off?.kind}
                aria-pressed={selected}
                aria-label={itemLabel(item, copy, selected)}
                onClick={(event) => select(item.lesson, event.currentTarget)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  select(item.lesson, event.currentTarget);
                }}
              >
                <span className="day-agenda__time cf-mono">{time}</span>
                <span className="day-agenda__code">{item.groupCode || copy.lessonFallback}</span>
                {item.programLevel && (
                  <span className="day-agenda__program">{item.programLevel}</span>
                )}
                {item.teacherName && (
                  <span className="day-agenda__teacher">{item.teacherName}</span>
                )}
                {(item.campusName || item.roomName) && (
                  <span className="day-agenda__where">
                    {item.campusName && (
                      <span className="day-agenda__campus">{item.campusName}</span>
                    )}
                    {item.campusName && item.roomName && (
                      <span className="day-agenda__dot" aria-hidden>
                        ·
                      </span>
                    )}
                    {item.roomName && <span className="day-agenda__room">{item.roomName}</span>}
                  </span>
                )}
                {item.statuses.length > 0 && (
                  <span className="day-agenda__statuses">
                    {item.statuses.map((status, index) => (
                      <span
                        key={`${status.kind}-${index}`}
                        className={`day-agenda__status day-agenda__status--${status.kind}`}
                      >
                        {agendaStatusTexts([status], statusLabels(copy))[0]}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
