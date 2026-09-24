"use client";

import { ClientOnly } from "@/components/ClientOnly";
import { ScheduleBoundary } from "@/data/ScheduleBoundary";
import { AuthGate } from "@/features/auth/AuthGate";
import { TeacherDashboard } from "@/features/teacher/TeacherDashboard";

export default function TeacherPage() {
  return (
    <ClientOnly>
      <AuthGate role="teacher">
        <ScheduleBoundary>
          <TeacherDashboard />
        </ScheduleBoundary>
      </AuthGate>
    </ClientOnly>
  );
}
