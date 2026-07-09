"use client";

import { TopBar } from "@/components/TopBar";

/** Increment 1 placeholder. Replaced by the teacher stream in increment 4. */
export default function TeacherPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 text-sm text-ink-mute">
        Teacher view arrives in increment 4.
      </main>
    </div>
  );
}
