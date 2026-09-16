"use client";

import { ClientOnly } from "@/components/ClientOnly";
import { ScheduleBoundary } from "@/data/ScheduleBoundary";
import { TeacherDashboard } from "@/features/teacher/TeacherDashboard";

export default function TeacherPage() {
  return (
    <ClientOnly>
      <ScheduleBoundary>
        <TeacherDashboard />
      </ScheduleBoundary>
    </ClientOnly>
  );
}
