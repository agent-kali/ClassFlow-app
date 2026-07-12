"use client";

import { useCampuses, useSchools, useTeachers } from "@/data/hooks";
import { schoolClass } from "@/components/SchoolChip";
import { formatUsd } from "@/domain/money";
import type { ScheduleFilters } from "./filters";

/** "David Okafor" → "David O." so the name fits beside the rate. */
function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

interface Props {
  filters: ScheduleFilters;
  toggle: (key: keyof ScheduleFilters, id: string) => void;
  clear: () => void;
  isActive: boolean;
  /** Below md the rail is a drawer, toggled from the toolbar. */
  mobileOpen: boolean;
  onMobileClose: () => void;
}

/**
 * The narrowing rail. Nothing is required: the default view is everything,
 * and each chip subtracts. Selected chips carry the school's hue.
 */
export function FilterRail({ filters, toggle, clear, isActive, mobileOpen, onMobileClose }: Props) {
  const schools = useSchools();
  const campuses = useCampuses();
  const teachers = useTeachers();

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close filters"
          onClick={onMobileClose}
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
        />
      )}
      <aside
        className={`${
          mobileOpen ? "fixed inset-y-0 left-0 z-40 flex w-60" : "hidden"
        } shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-surface px-3 py-3 md:static md:z-auto md:flex md:w-48`}
        style={mobileOpen ? { boxShadow: "var(--shadow-pop)" } : undefined}
      >
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
            Schools
          </h2>
          {isActive && (
            <button
              type="button"
              onClick={clear}
              className="text-[11px] text-accent hover:underline"
            >
              Show all
            </button>
          )}
        </div>
        <ul className="flex flex-col gap-0.5">
          {schools.map((school) => {
            const on = filters.schoolIds.has(school.id);
            const schoolCampuses = campuses.filter((c) => c.schoolId === school.id);
            return (
              <li key={school.id} className={schoolClass(school)}>
                <button
                  type="button"
                  onClick={() => toggle("schoolIds", school.id)}
                  aria-pressed={on}
                  className={`flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[13px] transition-colors ${
                    on ? "font-semibold" : "hover:bg-line-soft"
                  }`}
                  style={on ? { background: "var(--school-soft)", color: "var(--school)" } : undefined}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: "var(--school)" }}
                  />
                  <span className="cf-mono font-semibold">{school.shortName}</span>
                  <span className="truncate text-[11px] text-ink-mute">{school.district}</span>
                </button>
                {schoolCampuses.length > 1 && (
                  <ul className="mt-0.5 mb-1 ml-4 flex flex-col gap-0.5">
                    {schoolCampuses.map((campus) => {
                      const campusOn = filters.campusIds.has(campus.id);
                      return (
                        <li key={campus.id}>
                          <button
                            type="button"
                            onClick={() => toggle("campusIds", campus.id)}
                            aria-pressed={campusOn}
                            className={`w-full rounded px-1.5 py-0.5 text-left text-[12px] transition-colors ${
                              campusOn
                                ? "bg-accent-soft font-medium text-accent"
                                : "text-ink-mute hover:bg-line-soft"
                            }`}
                          >
                            {campus.name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">
          Teachers
        </h2>
        <ul className="flex flex-col gap-0.5">
          {teachers.map((teacher) => {
            const on = filters.teacherIds.has(teacher.id);
            return (
              <li key={teacher.id}>
                <button
                  type="button"
                  onClick={() => toggle("teacherIds", teacher.id)}
                  aria-pressed={on}
                  className={`flex w-full items-baseline gap-2 rounded px-1.5 py-1 text-left text-[13px] transition-colors ${
                    on ? "bg-accent-soft font-semibold text-accent" : "hover:bg-line-soft"
                  }`}
                >
                  <span className="cf-mono shrink-0 font-semibold">{teacher.code}</span>
                  <span className="min-w-0 truncate text-[12px] text-ink-mute" title={teacher.name}>
                    {shortName(teacher.name)}
                  </span>
                  <span className="cf-mono ml-auto shrink-0 text-[10px] text-ink-faint">
                    {formatUsd(teacher.usdRate)}/h
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      </aside>
    </>
  );
}
