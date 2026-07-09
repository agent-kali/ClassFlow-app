"use client";

import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { ClientOnly } from "@/components/ClientOnly";
import { useTeachers, useToday } from "@/data/hooks";
import { EarningsCard } from "@/features/teacher/EarningsCard";
import { TeacherStream } from "@/features/teacher/TeacherStream";

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

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-md flex-1 px-3 pt-4 pb-10">
        <div className="mb-4 flex items-center justify-between gap-3 px-1">
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
            className="cf-mono rounded border border-line bg-raised px-2 py-1.5 text-[12px] focus:border-accent focus:outline-none"
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code}
              </option>
            ))}
          </select>
        </div>

        <EarningsCard teacher={teacher} today={today} />

        <div className="mt-5">
          <TeacherStream teacher={teacher} today={today} />
        </div>
      </main>
    </div>
  );
}
