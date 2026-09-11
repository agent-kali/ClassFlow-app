"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { useLessons, useLookups, useTeachers, useToday } from "@/data/hooks";
import type { Instant } from "@/domain/earnings";
import { EarningsPanel } from "./EarningsPanel";
import { NextLessonBanner } from "./NextLessonBanner";
import { PeriodSwitcher } from "./PeriodSwitcher";
import { TeacherStream } from "./TeacherStream";
import {
  periodRange,
  periodScopeLabel,
  shiftPeriodAnchor,
  type PeriodMode,
} from "./period";
import { findOperationalLesson } from "./streamSummary";

/**
 * The one clock on this screen. Schedule status, next-up and earnings all read
 * the same instant, so a lesson can never look finished in one panel and
 * pending in another.
 */
function useAsOf(today: string): Instant {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return useMemo(
    () => ({ date: today, min: now.getHours() * 60 + now.getMinutes() }),
    [today, now]
  );
}

/**
 * Teacher's own screen, read-only by design. Two independent period machines:
 * schedule navigation moves the list, earnings scope moves the money, and the
 * next lesson answers to neither — it is always the teacher's real next
 * obligation.
 */
export function TeacherDashboard() {
  const teachers = useTeachers();
  const lessons = useLessons();
  const lookups = useLookups();
  const today = useToday();
  const asOf = useAsOf(today);

  const [teacherId, setTeacherId] = useState(teachers[0]?.id);
  const teacher = teachers.find((t) => t.id === teacherId) ?? teachers[0];

  const [scheduleMode, setScheduleMode] = useState<PeriodMode>("week");
  const [scheduleAnchor, setScheduleAnchor] = useState(today);
  const [earningsMode, setEarningsMode] = useState<PeriodMode>("week");
  const [earningsAnchor, setEarningsAnchor] = useState(today);

  const scheduleRange = useMemo(
    () => periodRange(scheduleMode, scheduleAnchor),
    [scheduleMode, scheduleAnchor]
  );
  const scheduleLabel = useMemo(
    () => periodScopeLabel(scheduleMode, scheduleRange),
    [scheduleMode, scheduleRange]
  );
  const earningsRange = useMemo(
    () => periodRange(earningsMode, earningsAnchor),
    [earningsMode, earningsAnchor]
  );

  const operational = useMemo(() => {
    if (!teacher) return null;
    return findOperationalLesson(
      lessons.filter((l) => l.teacherId === teacher.id),
      asOf
    );
  }, [lessons, teacher, asOf]);

  // The banner sticks; today's section and the earnings column must clear it.
  const shellRef = useRef<HTMLElement | null>(null);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    shellRef.current?.style.setProperty(
      "--teacher-sticky",
      `${bannerRef.current?.offsetHeight ?? 0}px`
    );
  });

  if (!teacher) return null;

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main ref={shellRef} className="teacher-shell flex-1 px-3 pt-4 pb-10 sm:px-4 lg:px-6">
        <header className="teacher-identity">
          <div className="min-w-0">
            <h1 className="text-[19px] font-bold leading-tight">{teacher.name}</h1>
            <p className="cf-mono text-[13px] text-ink-mute">
              {teacher.code} · {teacher.category}
            </p>
          </div>
          {/* Demo affordance: stand in any teacher's shoes. Kept quiet. */}
          <label className="teacher-identity__demo">
            <span className="sr-only">View as teacher</span>
            <select
              value={teacher.id}
              onChange={(e) => setTeacherId(e.target.value)}
              className="cf-mono rounded border border-line bg-raised px-2 py-1.5 text-[13px] text-ink-mute focus:border-accent focus:text-ink focus:outline-none"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} · {t.name}
                </option>
              ))}
            </select>
          </label>
        </header>

        {operational && (
          <div ref={bannerRef} className="teacher-banner-slot">
            <NextLessonBanner
              lesson={operational.lesson}
              happeningNow={operational.happeningNow}
              today={today}
              asOf={asOf}
              lookups={lookups}
            />
          </div>
        )}

        <div className="teacher-grid">
          <div className="teacher-grid__nav">
            <PeriodSwitcher
              mode={scheduleMode}
              onModeChange={setScheduleMode}
              label={scheduleLabel}
              onShift={(delta) =>
                setScheduleAnchor((a) => shiftPeriodAnchor(scheduleMode, a, delta))
              }
              scopeName="schedule"
            />
          </div>

          <div className="teacher-grid__aside">
            <EarningsPanel
              teacher={teacher}
              asOf={asOf}
              mode={earningsMode}
              range={earningsRange}
              onModeChange={setEarningsMode}
              onShift={(delta) =>
                setEarningsAnchor((a) => shiftPeriodAnchor(earningsMode, a, delta))
              }
            />
          </div>

          <div className="teacher-grid__stream">
            <TeacherStream
              teacher={teacher}
              today={today}
              mode={scheduleMode}
              anchor={scheduleAnchor}
              range={scheduleRange}
              scopeLabel={scheduleLabel}
              asOf={asOf}
              nextLessonId={
                operational && !operational.happeningNow ? operational.lesson.id : null
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}
