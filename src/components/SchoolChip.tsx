import type { School } from "@/domain/types";

export function schoolClass(school: School | undefined): string {
  return school ? `school-${school.color}` : "";
}

/** Small identity chip: the school's short name in its hue. */
export function SchoolChip({ school, title }: { school: School | undefined; title?: string }) {
  if (!school) return null;
  return (
    <span
      className={`${schoolClass(school)} cf-mono inline-flex items-center rounded-sm px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide`}
      style={{ color: "var(--school)", background: "var(--school-soft)" }}
      title={title ?? school.name}
    >
      {school.shortName}
    </span>
  );
}
