"use client";

import { Suspense } from "react";
import { ClientOnly } from "@/components/ClientOnly";
import { ScheduleBoundary } from "@/data/ScheduleBoundary";
import { AuthGate } from "@/features/auth/AuthGate";
import { TeacherDashboard } from "@/features/teacher/TeacherDashboard";

export default function TeacherPage() {
  return (
    <ClientOnly>
      <Suspense fallback={null}>
        <AuthGate role="teacher">
          <ScheduleBoundary>
            <TeacherDashboard />
          </ScheduleBoundary>
        </AuthGate>
      </Suspense>
    </ClientOnly>
  );
}
