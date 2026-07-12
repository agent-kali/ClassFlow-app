import type { School } from "@/domain/types";
import { Badge, schoolClass } from "@/components/Badge";

export { schoolClass };

/** Small identity chip: the school's short name in its hue. */
export function SchoolChip({ school, title }: { school: School | undefined; title?: string }) {
  if (!school) return null;
  return (
    <Badge tone="school" size="sm" school={school} title={title ?? school.name}>
      {school.shortName}
    </Badge>
  );
}
