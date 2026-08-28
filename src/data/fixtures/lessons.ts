import { addDays } from "date-fns";
import type { Lesson, LessonInput, LessonStatus } from "@/domain/types";
import { parseTime, weekDates } from "@/domain/time";

/**
 * A full, realistic teaching week, generated around an anchor date.
 * Durations are deliberately irregular (35 / 45 / 60 / 70 / 90 min) and
 * start times are off-grid — this domain has no uniform slots.
 *
 * Includes: one cancellation, one no-show, one reschedule (movedFrom set),
 * one teacher double-booking (overlap conflict), and two tight campus-to-campus
 * turnarounds that should raise travel warnings.
 */

/** Past + near-future weeks so teachers can browse months and managers can step weeks. */
const DEMO_WEEKS_BACK = 16;
const DEMO_WEEKS_FORWARD = 2;

interface Opts {
  cm?: string;
  week?: string;
  status?: LessonStatus;
  movedFrom?: { day: number; start: string };
}

export function buildWeekLessons(today: Date): Lesson[] {
  const days = weekDates(today);
  let seq = 0;

  const L = (
    day: number,
    start: string,
    end: string,
    classGroupId: string,
    roomId: string,
    teacherId: string,
    curriculum: string,
    opts: Opts = {}
  ): Lesson => ({
    id: `ls-${String(++seq).padStart(3, "0")}`,
    date: days[day],
    startMin: parseTime(start),
    endMin: parseTime(end),
    classGroupId,
    roomId,
    teacherId,
    curriculum,
    cmName: opts.cm,
    weekCode: opts.week,
    status: opts.status ?? "scheduled",
    movedFrom: opts.movedFrom
      ? { date: days[opts.movedFrom.day], startMin: parseTime(opts.movedFrom.start) }
      : undefined,
  });

  return [
    // ── Monday ──────────────────────────────────────────────────────────
    L(0, "7:50", "8:25", "fli-3c3", "fli-06-108", "t-tam", "Family & Friends 3: U4 pp.30–31", { cm: "Ms Hoa", week: "W12" }),
    L(0, "8:35", "9:10", "fli-4a1", "fli-06-201", "t-tam", "Family & Friends 4: U4 pp.34–35", { cm: "Ms Trang", week: "W12" }),
    L(0, "9:25", "10:00", "fli-5b2", "fli-06-305", "t-tam", "Family & Friends 5: U4 pp.32–33", { cm: "Mr Phuc", week: "W12" }),
    L(0, "15:30", "16:15", "sy-sj3", "sy-03-203", "t-kat", "Speaking: classroom objects"),
    L(0, "16:25", "17:10", "sy-starters", "sy-03-101", "t-kat", "Listening: colours & toys"),
    L(0, "17:45", "19:15", "ld-il102", "ld-07-403", "t-oli", "IELTS Practice Test 1 (B14) L&R — Reading Passages 1+2", { week: "D7" }),
    L(0, "18:00", "19:00", "ot-lp12b01b", "ot-03-205", "t-dav", "Prepare 5: U15 pp.88–89", { cm: "DHT", week: "W6D1" }),
    L(0, "19:10", "20:40", "ot-tn11a02b", "ot-03-302", "t-dav", "Solutions Int: U7 Grammar — reported speech", { cm: "NTL", week: "W6D1" }),
    L(0, "19:30", "21:00", "ld-il401", "ld-07-401", "t-oli", "Writing Task 2: opinion essays — model + timed drill", { week: "D7" }),

    // ── Tuesday ─────────────────────────────────────────────────────────
    L(1, "7:50", "8:25", "fli-4a1", "fli-06-201", "t-tam", "Family & Friends 4: U4 pp.36–37", { cm: "Ms Trang", week: "W12" }),
    L(1, "8:35", "9:10", "fli-3c3", "fli-06-108", "t-tam", "Family & Friends 3: U4 pp.32–33", { cm: "Ms Hoa", week: "W12" }),
    L(1, "15:30", "16:15", "sy-movers", "sy-03-102", "t-kat", "Reading: Part 3 gap fill"),
    L(1, "16:25", "17:10", "sy-flyers", "sy-03-204", "t-kat", "Reading & Writing: Part 5"),
    // Tight turnaround: OT03 campus → OT17 campus with a 30-min gap.
    L(1, "17:30", "18:30", "ot-lp09a02a", "ot-03-201", "t-mir", "Prepare 3: U12 pp.72–73", { cm: "PTM", week: "W6D2" }),
    L(1, "19:00", "20:10", "ot-tn07b01c", "ot-17-103", "t-mir", "Prepare 4: U11 Vocabulary — jobs & work", { cm: "LVA", week: "W6D2" }),
    L(1, "18:00", "19:00", "ot-lp12b01b", "ot-03-205", "t-dav", "Prepare 5: U15 pp.90–91", { cm: "DHT", week: "W6D2" }),
    L(1, "18:00", "19:30", "ld-it201", "ld-07-405", "t-leo", "TOEIC LC: Part 3–4 conversation drills", { week: "D3" }),

    // ── Wednesday ───────────────────────────────────────────────────────
    L(2, "7:50", "8:25", "fli-5b2", "fli-06-305", "t-tam", "Family & Friends 5: U4 pp.34–35", { cm: "Mr Phuc", week: "W12" }),
    L(2, "8:35", "9:10", "fli-3c3", "fli-06-108", "t-tam", "Phonics review: long vowels", { cm: "Ms Hoa", week: "W12" }),
    L(2, "9:25", "10:00", "fli-4a1", "fli-06-201", "t-tam", "Speaking: daily routines", { cm: "Ms Trang", week: "W12" }),
    L(2, "15:30", "16:15", "sy-sj5", "sy-03-203", "t-leo", "Project: my neighbourhood — poster prep"),
    L(2, "16:25", "17:10", "sy-sj3", "sy-03-203", "t-kat", "Grammar: have got / has got"),
    L(2, "17:45", "19:15", "ld-il102", "ld-07-403", "t-oli", "IELTS Practice Test 1 (B14) L&R — Listening Sections 3+4", { week: "D8" }),
    L(2, "18:00", "19:30", "ot-tn11a02b", "ot-03-302", "t-dav", "Solutions Int: U7 Speaking — negotiating", { cm: "NTL", week: "W6D3" }),
    // Cancelled: the school closed for a ceremony. Visibly excluded from pay.
    L(2, "19:10", "20:10", "ot-lp09a02a", "ot-03-201", "t-mir", "Prepare 3: U12 pp.74–75", { cm: "PTM", week: "W6D3", status: "cancelled" }),

    // ── Thursday ────────────────────────────────────────────────────────
    L(3, "7:50", "8:25", "fli-3c3", "fli-06-108", "t-tam", "Family & Friends 3: U4 review + quiz", { cm: "Ms Hoa", week: "W12" }),
    L(3, "8:35", "9:10", "fli-5b2", "fli-06-305", "t-tam", "Writing: describing my school", { cm: "Mr Phuc", week: "W12" }),
    L(3, "15:30", "16:15", "sy-starters", "sy-03-101", "t-kat", "Vocabulary: animals on the farm"),
    L(3, "16:25", "17:10", "sy-movers", "sy-03-102", "t-kat", "Speaking: Part 2 picture story"),
    L(3, "18:00", "19:00", "ot-lp12b01b", "ot-03-205", "t-dav", "Prepare 5: U16 pp.92–93", { cm: "DHT", week: "W6D3" }),
    L(3, "18:00", "19:30", "ld-it201", "ld-07-405", "t-leo", "TOEIC RC: Part 7 double passages", { week: "D4" }),
    // Demo overlap: LEO double-booked across campuses (conflict badge + warn border).
    L(3, "18:30", "19:30", "sy-sj3", "sy-03-101", "t-leo", "Cover: speaking club (double-booked)"),
    L(3, "19:30", "21:00", "ld-il401", "ld-07-401", "t-oli", "Speaking Part 3: abstract discussion strategies", { week: "D8" }),

    // ── Friday ──────────────────────────────────────────────────────────
    L(4, "7:50", "8:25", "fli-4a1", "fli-06-201", "t-tam", "Family & Friends 4: U4 review + quiz", { cm: "Ms Trang", week: "W12" }),
    L(4, "8:35", "9:10", "fli-5b2", "fli-06-305", "t-tam", "Family & Friends 5: U4 pp.36–37", { cm: "Mr Phuc", week: "W12" }),
    // No-show: class didn't turn up. Not paid.
    L(4, "15:30", "16:15", "sy-sj5", "sy-03-203", "t-leo", "Project: my neighbourhood — presentations", { status: "no-show" }),
    L(4, "16:25", "17:10", "sy-flyers", "sy-03-204", "t-kat", "Listening: Part 4 note completion"),
    // Rescheduled from Thursday 17:30 — the move stays visible on the lesson.
    L(4, "17:30", "18:40", "ot-tn07b01c", "ot-17-103", "t-mir", "Prepare 4: U11 Grammar — present perfect", { cm: "LVA", week: "W6D4", movedFrom: { day: 3, start: "17:30" } }),
    // Return hop the same evening: OT17 → OT03 with only 20 minutes — second travel warning.
    L(4, "19:00", "20:00", "ot-lp09a02a", "ot-03-201", "t-mir", "Prepare 3: catch-up workshop", { cm: "PTM", week: "W6D4" }),
    L(4, "17:45", "19:15", "ld-il102", "ld-07-403", "t-oli", "IELTS Writing Task 1: charts + process diagrams", { week: "D9" }),
    L(4, "19:10", "20:40", "ot-tn11a02b", "ot-03-302", "t-dav", "Solutions Int: U7 Writing — formal email", { cm: "NTL", week: "W6D4" }),

    // ── Saturday ────────────────────────────────────────────────────────
    L(5, "8:30", "10:00", "ot-lp09a02a", "ot-03-201", "t-mir", "Prepare 3: U12 Skills — reading + project", { cm: "PTM", week: "W6D5" }),
    L(5, "9:00", "9:45", "sy-flyers", "sy-03-204", "t-kat", "Mock test: Reading & Writing full paper"),
    L(5, "9:30", "11:00", "ld-it201", "ld-07-405", "t-leo", "TOEIC full mock: timed LC + review", { week: "D5" }),
    L(5, "10:00", "10:45", "sy-movers", "sy-03-102", "t-kat", "Mock test: Listening full paper"),
    L(5, "10:15", "11:45", "ot-lp12b01b", "ot-03-205", "t-dav", "Prepare 5: U16 Skills — video + discussion", { cm: "DHT", week: "W6D5" }),
    L(5, "14:00", "15:30", "ld-il401", "ld-07-401", "t-oli", "IELTS Practice Test 2 (B14): full Reading, timed", { week: "D9" }),
    L(5, "15:45", "17:15", "ld-il102", "ld-07-403", "t-oli", "Vocabulary for IELTS: U8 + collocation bank", { week: "D9" }),

    // ── Sunday ──────────────────────────────────────────────────────────
    L(6, "9:00", "10:30", "ot-tn11a02b", "ot-03-302", "t-dav", "Solutions Int: U7 review + progress test", { cm: "NTL", week: "W6D6" }),
    L(6, "9:30", "11:00", "ld-il401", "ld-07-401", "t-oli", "Mock speaking interviews — recorded + feedback", { week: "D10" }),
  ];
}

/**
 * Seed the store with several months of repeating weeks so period navigation
 * on the teacher screen (and week stepping on the manager) has real data.
 */
export function buildDemoLessons(today: Date): Lesson[] {
  const out: Lesson[] = [];
  for (let w = -DEMO_WEEKS_BACK; w <= DEMO_WEEKS_FORWARD; w++) {
    const week = buildWeekLessons(addDays(today, w * 7));
    const tag = w < 0 ? `p${-w}` : w === 0 ? "c" : `f${w}`;
    for (const lesson of week) {
      out.push({ ...lesson, id: `ls-${tag}-${lesson.id.slice(3)}` });
    }
  }
  return out;
}

export type { LessonInput };
