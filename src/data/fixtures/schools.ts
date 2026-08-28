import type { Campus, ClassGroup, Room, School } from "@/domain/types";

/**
 * Four partner schools with multiple campuses:
 *  - OT: Outeref, multiple campuses (OT03, OT17), numeric rooms
 *  - SY: Superyouth, campus SY3, numeric rooms
 *  - LD: London School, campus LD7, numeric rooms
 *  - FLI: Flamingo, campus FLI06, numeric rooms
 */

export const schools: School[] = [
  {
    id: "ot",
    name: "Outeref",
    shortName: "OT",
    district: "District 3",
    color: "teal",
    hasClassManagers: true,
  },
  {
    id: "sy",
    name: "Superyouth",
    shortName: "SY",
    district: "District 7",
    color: "amber",
    hasClassManagers: false,
  },
  {
    id: "ld",
    name: "London School",
    shortName: "LD",
    district: "Binh Thanh",
    color: "plum",
    hasClassManagers: false,
  },
  {
    id: "fli",
    name: "Flamingo",
    shortName: "FLI",
    district: "Thu Duc",
    color: "moss",
    hasClassManagers: true,
  },
];

export const campuses: Campus[] = [
  {
    id: "ot-03",
    schoolId: "ot",
    name: "OT03",
    address: "12 Nguyen Dinh Chieu, District 3",
  },
  {
    id: "ot-17",
    schoolId: "ot",
    name: "OT17",
    address: "88 Tran Hung Dao, District 3",
  },
  {
    id: "sy-03",
    schoolId: "sy",
    name: "SY3",
    address: "21 Ton Dat Tien, District 7",
  },
  {
    id: "ld-07",
    schoolId: "ld",
    name: "LD7",
    address: "600 Dien Bien Phu, Binh Thanh",
  },
  {
    id: "fli-06",
    schoolId: "fli",
    name: "FLI06",
    address: "35 Vo Van Ngan, Thu Duc",
  },
];

export const rooms: Room[] = [
  // OT03 campus — plain numbers
  { id: "ot-03-201", campusId: "ot-03", name: "201" },
  { id: "ot-03-205", campusId: "ot-03", name: "205" },
  { id: "ot-03-302", campusId: "ot-03", name: "302" },
  // OT17 campus — plain numbers
  { id: "ot-17-103", campusId: "ot-17", name: "103" },
  { id: "ot-17-104", campusId: "ot-17", name: "104" },
  { id: "ot-17-208", campusId: "ot-17", name: "208" },
  // SY3 campus — plain numbers
  { id: "sy-03-101", campusId: "sy-03", name: "101" },
  { id: "sy-03-102", campusId: "sy-03", name: "102" },
  { id: "sy-03-203", campusId: "sy-03", name: "203" },
  { id: "sy-03-204", campusId: "sy-03", name: "204" },
  // LD7 campus — 4th-floor numbers
  { id: "ld-07-401", campusId: "ld-07", name: "401" },
  { id: "ld-07-403", campusId: "ld-07", name: "403" },
  { id: "ld-07-405", campusId: "ld-07", name: "405" },
  // FLI06 campus — plain numbers
  { id: "fli-06-108", campusId: "fli-06", name: "108" },
  { id: "fli-06-201", campusId: "fli-06", name: "201" },
  { id: "fli-06-305", campusId: "fli-06", name: "305" },
];

export const classGroups: ClassGroup[] = [
  // OT — Outeref program/level codes
  { id: "ot-lp12b01b", schoolId: "ot", code: "LP12B01B", program: "Little Pioneers", level: "Primary 12B" },
  { id: "ot-lp09a02a", schoolId: "ot", code: "LP09A02A", program: "Little Pioneers", level: "Primary 9A" },
  { id: "ot-tn07b01c", schoolId: "ot", code: "TN07B01C", program: "Teen Navigators", level: "Pre-Intermediate" },
  { id: "ot-tn11a02b", schoolId: "ot", code: "TN11A02B", program: "Teen Navigators", level: "Intermediate" },
  // SY — Superyouth Cambridge YL codes
  { id: "sy-starters", schoolId: "sy", code: "STARTERS", program: "Cambridge Young Learners", level: "Pre-A1" },
  { id: "sy-movers", schoolId: "sy", code: "MOVERS", program: "Cambridge Young Learners", level: "A1" },
  { id: "sy-flyers", schoolId: "sy", code: "FLYERS", program: "Cambridge Young Learners", level: "A2" },
  { id: "sy-sj3", schoolId: "sy", code: "SJ3", program: "Junior English", level: "Grade 3" },
  { id: "sy-sj5", schoolId: "sy", code: "SJ5", program: "Junior English", level: "Grade 5" },
  // LD — London School exam prep
  { id: "ld-il102", schoolId: "ld", code: "IL102", program: "IELTS Foundation", level: "Band 4.5–5.5" },
  { id: "ld-il401", schoolId: "ld", code: "IL401", program: "IELTS Advanced", level: "Band 6.5+" },
  { id: "ld-it201", schoolId: "ld", code: "IT201", program: "TOEIC Intensive", level: "600+" },
  // FLI — Flamingo grade classes
  { id: "fli-3c3", schoolId: "fli", code: "3C3", program: "General English K-12", level: "Grade 3" },
  { id: "fli-4a1", schoolId: "fli", code: "4A1", program: "General English K-12", level: "Grade 4" },
  { id: "fli-5b2", schoolId: "fli", code: "5B2", program: "General English K-12", level: "Grade 5" },
];
