import type { LessonInput } from "@/domain/types";
import { parseTime, weekDates } from "@/domain/time";

/**
 * Raw schedule spreadsheets as partner schools actually email them —
 * different columns, different codes, different everything. Each sample
 * pairs the source rows (shown verbatim in the import wizard) with the
 * canonical lessons they normalize into, plus per-column mapping notes
 * that make the normalization legible.
 */

export interface ImportColumn {
  header: string;
  /** Which canonical Lesson field(s) this column feeds. */
  mapsTo: string;
  /** How it is transformed, in plain words. */
  note?: string;
}

export interface ImportSample {
  schoolId: string;
  /** How the file arrives: "LLA_Week7_v3.xlsx (emailed Tue 22:14)" */
  fileName: string;
  fileNote: string;
  columns: ImportColumn[];
  rows: string[][];
  /** What each raw row becomes. Parallel to `rows`. */
  normalized: (today: Date) => LessonInput[];
}

const lessonBase = {
  status: "scheduled" as const,
};

export const importSamples: ImportSample[] = [
  {
    schoolId: "ot",
    fileName: "OT_Week7_GVNN_v3.xlsx",
    fileNote: "Third version this week. Duration stated. CM as initials.",
    columns: [
      { header: "Date", mapsTo: "date", note: "\u201CTUE 07/14\u201D \u2192 ISO date" },
      { header: "Time", mapsTo: "start / end", note: "12-hour with PM \u2192 minutes" },
      { header: "Duration", mapsTo: "\u2014", note: "already implied by start/end; checked, not trusted" },
      { header: "Classes", mapsTo: "class group", note: "code matched to OT roster" },
      { header: "Week", mapsTo: "week code" },
      { header: "Room", mapsTo: "room", note: "\u201C205\u201D \u2192 OT03 campus" },
      { header: "CM", mapsTo: "class manager" },
      { header: "Lesson", mapsTo: "curriculum" },
      { header: "Teacher", mapsTo: "teacher", note: "initials \u2192 agency roster" },
    ],
    rows: [
      ["MON 07/13", "6:00-7:00PM", "1.00", "LP12B01B", "W7D1", "205", "DHT", "Prepare 5: U17 pp.94-95", "DAV"],
      ["MON 07/13", "7:10-8:40PM", "1.50", "TN11A02B", "W7D1", "302", "NTL", "Solutions Int: U8 Vocabulary", "DAV"],
      ["WED 07/15", "5:30-6:30PM", "1.00", "LP09A02A", "W7D2", "201", "PTM", "Prepare 3: U13 pp.76-77", "MIR"],
      ["SAT 07/18", "8:30-10:00AM", "1.50", "LP09A02A", "W7D5", "201", "PTM", "Prepare 3: U13 Skills", "MIR"],
    ],
    normalized: (today) => {
      const next = weekDates(new Date(today.getTime() + 7 * 86400000));
      return [
        { ...lessonBase, date: next[0], startMin: parseTime("18:00"), endMin: parseTime("19:00"), classGroupId: "ot-lp12b01b", roomId: "ot-03-205", teacherId: "t-dav", cmName: "DHT", weekCode: "W7D1", curriculum: "Prepare 5: U17 pp.94–95" },
        { ...lessonBase, date: next[0], startMin: parseTime("19:10"), endMin: parseTime("20:40"), classGroupId: "ot-tn11a02b", roomId: "ot-03-302", teacherId: "t-dav", cmName: "NTL", weekCode: "W7D1", curriculum: "Solutions Int: U8 Vocabulary" },
        { ...lessonBase, date: next[2], startMin: parseTime("17:30"), endMin: parseTime("18:30"), classGroupId: "ot-lp09a02a", roomId: "ot-03-201", teacherId: "t-mir", cmName: "PTM", weekCode: "W7D2", curriculum: "Prepare 3: U13 pp.76–77" },
        { ...lessonBase, date: next[5], startMin: parseTime("8:30"), endMin: parseTime("10:00"), classGroupId: "ot-lp09a02a", roomId: "ot-03-201", teacherId: "t-mir", cmName: "PTM", weekCode: "W7D5", curriculum: "Prepare 3: U13 Skills" },
      ];
    },
  },
  {
    schoolId: "sy",
    fileName: "Superyouth timetable next wk.xlsx",
    fileNote: "No duration column — derived from times. Teacher named in the file, not per row. No CM at this school.",
    columns: [
      { header: "Date", mapsTo: "date", note: "day name only \u2192 dated within the sent week" },
      { header: "Time", mapsTo: "start / end", note: "duration derived: 8:00\u20138:45 \u2192 45 min" },
      { header: "Class", mapsTo: "class group" },
      { header: "Room", mapsTo: "room", note: "Room number from SY3 campus" },
      { header: "Week", mapsTo: "week code" },
      { header: "Lessons", mapsTo: "curriculum", note: "sometimes just a skill \u2014 kept as-is" },
    ],
    rows: [
      ["MON", "15:30-16:15", "SJ3", "203", "2", "Speaking"],
      ["MON", "16:25-17:10", "STARTERS", "101", "2", "Unit 5: In the park"],
      ["THU", "15:30-16:15", "MOVERS", "102", "2", "Listening Part 1"],
      ["SAT", "9:00-9:45", "FLYERS", "204", "2", "Mock test review"],
    ],
    normalized: (today) => {
      const next = weekDates(new Date(today.getTime() + 7 * 86400000));
      return [
        { ...lessonBase, date: next[0], startMin: parseTime("15:30"), endMin: parseTime("16:15"), classGroupId: "sy-sj3", roomId: "sy-03-203", teacherId: "t-kat", weekCode: "2", curriculum: "Speaking" },
        { ...lessonBase, date: next[0], startMin: parseTime("16:25"), endMin: parseTime("17:10"), classGroupId: "sy-starters", roomId: "sy-03-101", teacherId: "t-kat", weekCode: "2", curriculum: "Unit 5: In the park" },
        { ...lessonBase, date: next[3], startMin: parseTime("15:30"), endMin: parseTime("16:15"), classGroupId: "sy-movers", roomId: "sy-03-102", teacherId: "t-kat", weekCode: "2", curriculum: "Listening Part 1" },
        { ...lessonBase, date: next[5], startMin: parseTime("9:00"), endMin: parseTime("9:45"), classGroupId: "sy-flyers", roomId: "sy-03-204", teacherId: "t-kat", weekCode: "2", curriculum: "Mock test review" },
      ];
    },
  },
  {
    schoolId: "ld",
    fileName: "LD schedule 13-19.7 FINAL(2).xlsx",
    fileNote: "Dotted 12-hour times. Book and page detail buried in Remarks. No CM.",
    columns: [
      { header: "Time", mapsTo: "start / end", note: "\u201C5.45-7.15pm\u201D \u2192 17:45\u201319:15" },
      { header: "Room", mapsTo: "room" },
      { header: "Class", mapsTo: "class group" },
      { header: "Lesson", mapsTo: "week code", note: "\u201CD11\u201D is a syllabus-day locator, not content" },
      { header: "Remarks", mapsTo: "curriculum", note: "nested book/section detail kept whole" },
      { header: "GV", mapsTo: "teacher" },
    ],
    rows: [
      ["MON 5.45-7.15pm", "403", "IL102", "D11", "IELTS Practice Test 2 (B14) L&R — Listening S1+2", "OLIVER"],
      ["MON 7.30-9.00pm", "401", "IL401", "D11", "Writing Task 2: discussion essays — peer marking", "OLIVER"],
      ["TUE 6.00-7.30pm", "405", "IT201", "D6", "TOEIC LC Part 2: response strategies", "LEO"],
      ["SAT 2.00-3.30pm", "401", "IL401", "D12", "Full mock: Speaking parts 1-3, recorded", "OLIVER"],
    ],
    normalized: (today) => {
      const next = weekDates(new Date(today.getTime() + 7 * 86400000));
      return [
        { ...lessonBase, date: next[0], startMin: parseTime("17:45"), endMin: parseTime("19:15"), classGroupId: "ld-il102", roomId: "ld-07-403", teacherId: "t-oli", weekCode: "D11", curriculum: "IELTS Practice Test 2 (B14) L&R — Listening S1+2" },
        { ...lessonBase, date: next[0], startMin: parseTime("19:30"), endMin: parseTime("21:00"), classGroupId: "ld-il401", roomId: "ld-07-401", teacherId: "t-oli", weekCode: "D11", curriculum: "Writing Task 2: discussion essays — peer marking" },
        { ...lessonBase, date: next[1], startMin: parseTime("18:00"), endMin: parseTime("19:30"), classGroupId: "ld-it201", roomId: "ld-07-405", teacherId: "t-leo", weekCode: "D6", curriculum: "TOEIC LC Part 2: response strategies" },
        { ...lessonBase, date: next[5], startMin: parseTime("14:00"), endMin: parseTime("15:30"), classGroupId: "ld-il401", roomId: "ld-07-401", teacherId: "t-oli", weekCode: "D12", curriculum: "Full mock: Speaking parts 1-3, recorded" },
      ];
    },
  },
];
