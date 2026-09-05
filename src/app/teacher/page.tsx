"use client";

import { ClientOnly } from "@/components/ClientOnly";
import { TeacherDashboard } from "@/features/teacher/TeacherDashboard";

export default function TeacherPage() {
  return (
    <ClientOnly>
      <TeacherDashboard />
    </ClientOnly>
  );
}
