"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Lesson, SchoolColor } from "@/domain/types";
import type { Conflict } from "@/domain/conflicts";
import type { useLookups } from "@/data/hooks";
import { formatAgendaMin } from "@/domain/time";
import { useLocale } from "@/features/landing/locale";
import { TOUR_BLOCK_ALL_LESSONS } from "@/features/tour/lessonLock";
import {
  agendaStatusTexts,
  buildDayAgenda,
  buildTightTravelConnectors,
  programLevelOf,
  resolveDayCues,
  type AgendaStatus,
  type DayAgendaItem,
} from "./dayAgenda";
import { getManagerCopy, type ManagerChromeCopy } from "./copy";
import { accentForSchool, isLessonPast } from "./lessonCardModel";
import { scrollGroupWithin } from "./scrollWithin";

interface Props {
  lessons: Lesson[];
  date: string;
  today: string;
  teacherIds: string[];
  lookups: ReturnType<typeof useLookups>;
  conflictsByLesson: Map<string, Conflict[]>;
  focusedLessonIds?: string[] | null;
  focusNonce?: number;
  selectedLessonId?: string | null;
  lockLessonSelection?: string | null;
  onSelectLesson?: (lesson: Lesson, el: HTMLElement) => void;
}

function useNowMinute(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function statusLabels(copy: ManagerChromeCopy) {
  return {
    cancelled: copy.cancelledCard,
    noShow: copy.noShowCard,
    doubleBooking: copy.doubleBookingCard,
    tightTravel: copy.tightTravelCard,
  };
}

function cueOf(id: string, nowIds: readonly string[], nextIds: readonly string[]) {
  if (nowIds.includes(id)) return "now" as const;
  if (nextIds.includes(id)) return "next" as const;
  return null;
}

function itemLabel(
  item: DayAgendaItem,
  copy: ManagerChromeCopy,
  teacherCode: string,
  cue: "now" | "next" | null,
  selected: boolean
): string {
  const where = [item.campusName, item.roomName].filter(Boolean).join(", ");
  const teacher = [item.teacherName, teacherCode].filter(Boolean).join(" ");
  const cueText = cue === "now" ? copy.nowCue : cue === "next" ? copy.nextCue : "";
  return [
    cueText,
    `${formatAgendaMin(item.lesson.startMin)}–${formatAgendaMin(item.lesson.endMin)}`,
    item.groupCode || copy.lessonFallback,
    item.programLevel,
    teacher,
    where,
    ...agendaStatusTexts(item.statuses, statusLabels(copy)),
    selected ? copy.selected : "",
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * The day's lessons in reading order. Time is a gutter, not a scale, so an
 * empty hour takes no space. Each lesson is a button into the existing popover.
 */
export function DayLedger({
  lessons,
  date,
  today,
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
  const now = useNowMinute();
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

  const connectors = useMemo(
    () => buildTightTravelConnectors(items, conflictsByLesson),
    [items, conflictsByLesson]
  );
  const connectorsBefore = useMemo(() => {
    const map = new Map<string, typeof connectors>();
    for (const connector of connectors) {
      const list = map.get(connector.beforeLessonId) ?? [];
      list.push(connector);
      map.set(connector.beforeLessonId, list);
    }
    return map;
  }, [connectors]);

  const nowMin = date === today ? now.getHours() * 60 + now.getMinutes() : null;
  const cues = useMemo(
    () => resolveDayCues(items, date, today, nowMin),
    [items, date, today, nowMin]
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

  const empty =
    teacherIds.length === 0 ? copy.noTeachersSelected : items.length === 0 ? copy.noLessons : null;

  return (
    <section ref={listRef} className="day-ledger" aria-label={copy.dayAgendaAria}>
      {empty ? (
        <p className="day-ledger__empty">{empty}</p>
      ) : (
        <div className="day-ledger__sheet">
        {items.map((item) => {
          const hops = connectorsBefore.get(item.lesson.id) ?? [];
          return (
            <div key={item.lesson.id} className="day-ledger__entry">
              {hops.map((hop) => (
                <p key={`${hop.fromLessonId}-${hop.beforeLessonId}`} className="day-ledger__hop">
                  <span className="day-ledger__hop-label">
                    {copy.tightTravelBetween(hop.gapMin, hop.fromCampus, hop.toCampus)}
                  </span>
                </p>
              ))}
              <LedgerRow
                item={item}
                copy={copy}
                teacherCode={lookups.teachersById.get(item.lesson.teacherId)?.code ?? ""}
                schoolColor={lookups.schoolOfRoom(item.lesson.roomId)?.color}
                cue={cueOf(item.lesson.id, cues.nowIds, cues.nextIds)}
                past={isLessonPast(item.lesson, today, nowMin)}
                selected={selectedLessonId === item.lesson.id}
                focused={focusedIds?.has(item.lesson.id) ?? false}
                onSelect={select}
              />
            </div>
          );
        })}
        </div>
      )}
    </section>
  );
}

function LedgerRow({
  item,
  copy,
  teacherCode,
  schoolColor,
  cue,
  past,
  selected,
  focused,
  onSelect,
}: {
  item: DayAgendaItem;
  copy: ManagerChromeCopy;
  teacherCode: string;
  schoolColor: SchoolColor | undefined;
  cue: "now" | "next" | null;
  past: boolean;
  selected: boolean;
  focused: boolean;
  onSelect: (lesson: Lesson, el: HTMLElement) => void;
}) {
  const { lesson } = item;
  const off = item.statuses.find(
    (status): status is Extract<AgendaStatus, { kind: "cancelled" | "no-show" }> =>
      status.kind === "cancelled" || status.kind === "no-show"
  );
  const hasConflict = item.statuses.some((status) => status.kind === "double-booking");
  const hasTravel = item.statuses.some((status) => status.kind === "tight-travel");
  const isOff = lesson.status !== "scheduled";
  const texts = agendaStatusTexts(item.statuses, statusLabels(copy));

  return (
    <button
      type="button"
      className="day-ledger__row"
      style={{ "--lc-accent": accentForSchool(schoolColor, isOff, past) } as CSSProperties}
      data-lesson-id={lesson.id}
      data-selected={selected || undefined}
      data-focused={focused || undefined}
      data-conflict={hasConflict || undefined}
      data-travel={hasTravel || undefined}
      data-status={off?.kind}
      data-past={past || undefined}
      data-cue={cue ?? undefined}
      aria-pressed={selected}
      aria-label={itemLabel(item, copy, teacherCode, cue, selected)}
      onClick={(event) => onSelect(lesson, event.currentTarget)}
    >
      <span className="day-ledger__time cf-mono">
        {cue && (
          <span className={`day-ledger__cue day-ledger__cue--${cue}`}>
            {cue === "now" ? copy.nowCue : copy.nextCue}
          </span>
        )}
        <span className="day-ledger__start">{formatAgendaMin(lesson.startMin)}</span>
        <span className="day-ledger__end">{formatAgendaMin(lesson.endMin)}</span>
      </span>
      <span className="day-ledger__class">
        <span className="day-ledger__code">{item.groupCode || copy.lessonFallback}</span>
        {item.programLevel && <span className="day-ledger__program">{item.programLevel}</span>}
      </span>
      {item.teacherName && (
        <span className="day-ledger__teacher">
          <span className="day-ledger__teacher-name">{item.teacherName}</span>
          {teacherCode && <span className="day-ledger__teacher-code cf-mono">{teacherCode}</span>}
        </span>
      )}
      {(item.campusName || item.roomName) && (
        <span className="day-ledger__where">
          {item.campusName && <span className="day-ledger__campus">{item.campusName}</span>}
          {item.campusName && item.roomName && (
            <span className="day-ledger__dot" aria-hidden>
              ·
            </span>
          )}
          {item.roomName && <span className="day-ledger__room">{item.roomName}</span>}
        </span>
      )}
      {texts.length > 0 && (
        <span className="day-ledger__statuses">
          {item.statuses.map((status, index) => (
            <span
              key={`${status.kind}-${index}`}
              className={`day-ledger__status day-ledger__status--${status.kind}`}
            >
              {texts[index]}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
