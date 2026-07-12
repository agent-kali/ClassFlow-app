"use client";

import { useMemo, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { ClientOnly } from "@/components/ClientOnly";
import { useTeachers, useToday } from "@/data/hooks";
import { EarningsCard } from "@/features/teacher/EarningsCard";
import { TeacherStream } from "@/features/teacher/TeacherStream";
import {
  PeriodSwitcher,
  periodRange,
  periodScopeLabel,
  shiftPeriodAnchor,
  type PeriodMode,
} from "@/features/teacher/PeriodSwitcher";

export default function TeacherPage() {
  return (
    <ClientOnly>
      <TeacherScreen />
    </ClientOnly>
  );
}

function TeacherScreen() {
  const teachers = useTeachers();
  const today = useToday();
  const [teacherId, setTeacherId] = useState(teachers[0]?.id);
  const teacher = teachers.find((t) => t.id === teacherId) ?? teachers[0];

  const [mode, setMode] = useState<PeriodMode>("month");
  const [anchor, setAnchor] = useState(today);

  const range = useMemo(() => periodRange(mode, anchor), [mode, anchor]);
  const scopeLabel = useMemo(() => periodScopeLabel(mode, range), [mode, range]);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      {/*
        Mobile: unchanged narrow column.
        xl (≥1280): two-zone shell — sticky left rail + scrolling lesson list.
      */}
      <main className="mx-auto w-full max-w-md flex-1 px-3 pt-4 pb-10 xl:max-w-6xl xl:px-6">
        <div className="xl:grid xl:grid-cols-[16.5rem_minmax(0,1fr)] xl:items-start xl:gap-8">
          <aside className="xl:sticky xl:top-4 xl:self-start">
            <div className="mb-4 flex items-center justify-between gap-3 px-1 xl:mb-5 xl:flex-col xl:items-stretch xl:gap-3">
              <div>
                <h1 className="text-[17px] font-bold leading-tight">{teacher.name}</h1>
                <p className="cf-mono text-[11px] text-ink-mute">
                  {teacher.code} · {teacher.category}
                </p>
              </div>
              {/* Demo affordance: stand in any teacher's shoes. */}
              <select
                aria-label="Viewing as teacher"
                value={teacher.id}
                onChange={(e) => setTeacherId(e.target.value)}
                className="cf-mono rounded border border-line bg-raised px-2 py-1.5 text-[12px] focus:border-accent focus:outline-none xl:w-full"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <PeriodSwitcher
                mode={mode}
                onModeChange={setMode}
                label={scopeLabel}
                onShift={(delta) => setAnchor((a) => shiftPeriodAnchor(mode, a, delta))}
              />
            </div>

            <EarningsCard teacher={teacher} anchor={anchor} mode={mode} />
          </aside>

          <div className="mt-5 xl:mt-0">
            <TeacherStream
              teacher={teacher}
              today={today}
              range={range}
              scopeLabel={scopeLabel}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
