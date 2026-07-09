"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { format, parseISO } from "date-fns";
import { importSamples, type ImportSample } from "@/data/fixtures/importSamples";
import { useLessonMutations, useLookups, useSchools, useToday } from "@/data/hooks";
import { formatRange } from "@/domain/time";
import { SchoolChip } from "@/components/SchoolChip";

/**
 * The product's core idea made visible: each school's raw spreadsheet,
 * exactly as it arrives, flowing column by column into one canonical
 * lesson model — then actually landing on the schedule.
 */
export function ImportDialog({ onClose }: { onClose: () => void }) {
  const schools = useSchools();
  const today = useToday();
  const lookups = useLookups();
  const { importLessons } = useLessonMutations();
  const [sample, setSample] = useState<ImportSample | null>(null);

  const normalized = useMemo(
    () => (sample ? sample.normalized(parseISO(today)) : []),
    [sample, today]
  );

  const finish = () => {
    if (sample) importLessons(normalized);
    onClose();
  };

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/35" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[92dvh] w-[54rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-line bg-surface"
          style={{ boxShadow: "var(--shadow-pop)" }}
        >
          <div className="border-b border-line px-4 py-3">
            <Dialog.Title className="text-[15px] font-semibold">
              Import a school&apos;s schedule
            </Dialog.Title>
            <Dialog.Description className="mt-0.5 text-[12px] text-ink-mute">
              {sample
                ? "The file as the school sent it, and what ClassFlow makes of it. Nobody re-types anything."
                : "Every school sends its own format. Pick one to see how it becomes one clean schedule."}
            </Dialog.Description>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!sample ? (
              <ul className="grid gap-2 sm:grid-cols-3">
                {importSamples.map((s) => {
                  const school = lookups.schoolsById.get(s.schoolId);
                  return (
                    <li key={s.schoolId}>
                      <button
                        type="button"
                        onClick={() => setSample(s)}
                        className="flex h-full w-full flex-col gap-1.5 rounded-md border border-line bg-raised p-3 text-left transition-colors hover:border-accent"
                      >
                        <span className="flex items-center gap-2">
                          <SchoolChip school={school} />
                          <span className="text-[13px] font-semibold">{school?.name}</span>
                        </span>
                        <span className="cf-mono truncate text-[11px] text-ink" title={s.fileName}>
                          {s.fileName}
                        </span>
                        <span className="text-[11px] leading-snug text-ink-mute">{s.fileNote}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ImportPreview sample={sample} normalized={normalized} lookups={lookups} />
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
            {sample ? (
              <button
                type="button"
                onClick={() => setSample(null)}
                className="rounded border border-line px-3 py-1.5 text-[13px] font-medium hover:border-ink-faint"
              >
                Pick another school
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded border border-line px-3 py-1.5 text-[13px] font-medium hover:border-ink-faint"
                >
                  Close
                </button>
              </Dialog.Close>
              {sample && (
                <button
                  type="button"
                  onClick={finish}
                  className="rounded bg-accent px-3 py-1.5 text-[13px] font-semibold text-accent-ink hover:opacity-90"
                >
                  Add {normalized.length} lessons to the schedule
                </button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ImportPreview({
  sample,
  normalized,
  lookups,
}: {
  sample: ImportSample;
  normalized: ReturnType<ImportSample["normalized"]>;
  lookups: ReturnType<typeof useLookups>;
}) {
  const school = lookups.schoolsById.get(sample.schoolId);

  return (
    <div className="space-y-4">
      {/* 1 — the file as it arrived */}
      <section>
        <h3 className="mb-1.5 flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
          <span>What {school?.shortName} sent</span>
          <span className="cf-mono normal-case tracking-normal text-ink-faint">{sample.fileName}</span>
        </h3>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full border-collapse bg-raised text-[12px]">
            <thead>
              <tr>
                {sample.columns.map((c) => (
                  <th
                    key={c.header}
                    className="cf-mono border-b border-line bg-surface px-2 py-1.5 text-left font-semibold whitespace-nowrap"
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sample.rows.map((row, i) => (
                <tr key={i} className="border-b border-line-soft last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="cf-mono px-2 py-1.5 whitespace-nowrap text-ink-mute">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2 — how each column maps */}
      <section>
        <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
          How ClassFlow reads it
        </h3>
        <ul className="grid gap-1 sm:grid-cols-2">
          {sample.columns.map((c) => (
            <li
              key={c.header}
              className="flex items-baseline gap-2 rounded border border-line-soft bg-raised px-2 py-1.5 text-[12px]"
            >
              <span className="cf-mono w-20 shrink-0 font-semibold">{c.header}</span>
              <span aria-hidden className="shrink-0 text-ink-faint">&rarr;</span>
              <span className="shrink-0 font-medium text-accent">{c.mapsTo}</span>
              {c.note && <span className="text-[11px] text-ink-mute">{c.note}</span>}
            </li>
          ))}
        </ul>
      </section>

      {/* 3 — the canonical result */}
      <section>
        <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
          What lands on the schedule — week of {format(parseISO(normalized[0].date), "d MMM")}
        </h3>
        <div className="overflow-x-auto rounded-md border border-accent/40">
          <table className="w-full border-collapse bg-raised text-[12px]">
            <thead>
              <tr>
                {["When", "Class", "Room", "Teacher", "CM", "Teaching"].map((h) => (
                  <th
                    key={h}
                    className="border-b border-line bg-accent-soft/50 px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {normalized.map((l, i) => (
                <tr key={i} className="border-b border-line-soft last:border-0">
                  <td className="cf-mono px-2 py-1.5 whitespace-nowrap">
                    {format(parseISO(l.date), "EEE dd/MM")} {formatRange(l.startMin, l.endMin)}
                    <span className="ml-1 text-ink-faint">
                      ({((l.endMin - l.startMin) / 60).toFixed(2)}h)
                    </span>
                  </td>
                  <td className="cf-mono px-2 py-1.5 font-semibold whitespace-nowrap">
                    {lookups.classGroupsById.get(l.classGroupId)?.code}
                  </td>
                  <td className="cf-mono px-2 py-1.5 whitespace-nowrap">
                    {lookups.roomsById.get(l.roomId)?.name}
                  </td>
                  <td className="cf-mono px-2 py-1.5 whitespace-nowrap">
                    {lookups.teachersById.get(l.teacherId)?.code}
                  </td>
                  <td className="cf-mono px-2 py-1.5 whitespace-nowrap text-ink-mute">
                    {l.cmName ?? "—"}
                  </td>
                  <td className="max-w-64 truncate px-2 py-1.5 text-ink-mute" title={l.curriculum}>
                    {l.curriculum}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
