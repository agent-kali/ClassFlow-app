/**
 * Display-only formatting for the teacher lesson row and next-up banner.
 * Never mutates stored lesson or lookup values; unknown shapes pass through.
 */

export function formatWeekCode(code: string | undefined | null): string | null {
  if (!code?.trim()) return null;
  const raw = code.trim();
  const weekDay = raw.match(/^W(\d+)D(\d+)$/i);
  if (weekDay) return `Week ${weekDay[1]} · Day ${weekDay[2]}`;
  const weekOnly = raw.match(/^W(\d+)$/i);
  if (weekOnly) return `Week ${weekOnly[1]}`;
  const dayOnly = raw.match(/^D(\d+)$/i);
  if (dayOnly) return `Day ${dayOnly[1]}`;
  const numbered = raw.match(/^(\d+)$/);
  if (numbered) return `Week ${numbered[1]}`;
  return raw;
}

/**
 * Expand textbook shorthand: "Prepare 5: U15 pp.88–89" becomes
 * "Prepare 5 · Unit 15 · pages 88–89". Colon-less or unfamiliar strings
 * keep their wording after the same U / pp expansions.
 */
export function formatCurriculum(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  let text = raw.trim();
  text = text.replace(/\bpp\.(\d+)\s*[–-]\s*(\d+)/gi, "pages $1–$2");
  text = text.replace(/\bU(\d+)\b/g, "Unit $1");

  const colon = text.indexOf(": ");
  if (colon === -1) return text;

  const book = text.slice(0, colon).trim();
  const rest = glueUnitClause(text.slice(colon + 2).trim());
  if (!rest) return book;
  return `${book} · ${rest}`;
}

function glueUnitClause(rest: string): string {
  const match = rest.match(/^(Unit \d+)\s+(.*)$/);
  if (!match) return rest;
  const [, unit, after] = match;
  if (after.startsWith("pages ")) return `${unit} · ${after}`;
  if (after.startsWith("+")) return `${unit} ${after}`;
  return `${unit} · ${after}`;
}

export function formatClassIdentity(group: {
  program?: string | null;
  code?: string | null;
  level?: string | null;
} | null | undefined): {
  program: string | null;
  classLabel: string | null;
  level: string | null;
} {
  const program = group?.program?.trim() || null;
  const code = group?.code?.trim();
  const level = group?.level?.trim() || null;
  return {
    program,
    classLabel: code ? `Class ${code}` : null,
    level,
  };
}

export function formatLocation(parts: {
  schoolName?: string | null;
  campusName?: string | null;
  roomName?: string | null;
}): string | null {
  const bits: string[] = [];
  if (parts.schoolName?.trim()) bits.push(parts.schoolName.trim());
  if (parts.campusName?.trim()) bits.push(`Campus ${parts.campusName.trim()}`);
  if (parts.roomName?.trim()) bits.push(`Room ${parts.roomName.trim()}`);
  return bits.length ? bits.join(" · ") : null;
}

export function formatCoTeacher(cmName: string | undefined | null): string | null {
  const name = cmName?.trim();
  return name ? `Co-teacher ${name}` : null;
}

/** Compact operational line for the next-up banner. */
export function formatBannerLine(input: {
  program?: string | null;
  code?: string | null;
  schoolName?: string | null;
  campusName?: string | null;
  roomName?: string | null;
}): string | null {
  const { program, classLabel } = formatClassIdentity({
    program: input.program,
    code: input.code,
  });
  const location = formatLocation({
    schoolName: input.schoolName,
    campusName: input.campusName,
    roomName: input.roomName,
  });
  const bits = [program, classLabel, location].filter(Boolean);
  return bits.length ? bits.join(" · ") : null;
}
