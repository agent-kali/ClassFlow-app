import type { Campus, ClassGroup, Room, School } from "@/domain/types";

/**
 * Four partner schools, four characters:
 *  - LLA: language academy, two campuses, numeric rooms, CM codes, W#D# syllabus
 *  - SJS: young-learner school, named rooms, no CM, skill-only lesson notes
 *  - IEC: adult exam centre, numeric rooms, no CM, exam-reference curriculum
 *  - VHB: bilingual public school, "P.###" rooms, CM names, 35-minute periods
 */

export const schools: School[] = [
  {
    id: "lla",
    name: "Lighthouse Language Academy",
    shortName: "LLA",
    district: "District 3 / District 5",
    color: "teal",
    hasClassManagers: true,
  },
  {
    id: "sjs",
    name: "Saigon Junior School",
    shortName: "SJS",
    district: "District 7",
    color: "amber",
    hasClassManagers: false,
  },
  {
    id: "iec",
    name: "Intera English Centre",
    shortName: "IEC",
    district: "Binh Thanh",
    color: "plum",
    hasClassManagers: false,
  },
  {
    id: "vhb",
    name: "Van Hoa Bilingual School",
    shortName: "VHB",
    district: "Thu Duc",
    color: "moss",
    hasClassManagers: true,
  },
];

export const campuses: Campus[] = [
  {
    id: "lla-ndc",
    schoolId: "lla",
    name: "Nguyen Dinh Chieu",
    address: "12 Nguyen Dinh Chieu, District 3",
  },
  {
    id: "lla-thd",
    schoolId: "lla",
    name: "Tran Hung Dao",
    address: "88 Tran Hung Dao, District 5",
  },
  {
    id: "sjs-crescent",
    schoolId: "sjs",
    name: "Crescent Campus",
    address: "21 Ton Dat Tien, District 7",
  },
  {
    id: "iec-dbp",
    schoolId: "iec",
    name: "Dien Bien Phu",
    address: "600 Dien Bien Phu, Binh Thanh",
  },
  {
    id: "vhb-main",
    schoolId: "vhb",
    name: "Main Building",
    address: "35 Vo Van Ngan, Thu Duc",
  },
];

export const rooms: Room[] = [
  // LLA — plain numbers
  { id: "lla-ndc-201", campusId: "lla-ndc", name: "201" },
  { id: "lla-ndc-205", campusId: "lla-ndc", name: "205" },
  { id: "lla-ndc-302", campusId: "lla-ndc", name: "302" },
  { id: "lla-thd-103", campusId: "lla-thd", name: "103" },
  { id: "lla-thd-104", campusId: "lla-thd", name: "104" },
  // SJS — named rooms with a number in brackets
  { id: "sjs-ocean", campusId: "sjs-crescent", name: "Ocean (203)" },
  { id: "sjs-coral", campusId: "sjs-crescent", name: "Coral (105)" },
  { id: "sjs-reef", campusId: "sjs-crescent", name: "Reef (201)" },
  { id: "sjs-lagoon", campusId: "sjs-crescent", name: "Lagoon (102)" },
  // IEC — 4th-floor numbers
  { id: "iec-401", campusId: "iec-dbp", name: "401" },
  { id: "iec-403", campusId: "iec-dbp", name: "403" },
  { id: "iec-405", campusId: "iec-dbp", name: "405" },
  // VHB — Vietnamese "P." convention
  { id: "vhb-p108", campusId: "vhb-main", name: "P.108" },
  { id: "vhb-p201", campusId: "vhb-main", name: "P.201" },
  { id: "vhb-p305", campusId: "vhb-main", name: "P.305" },
];

export const classGroups: ClassGroup[] = [
  // LLA — program/level packed into the code
  { id: "lla-lp12b01b", schoolId: "lla", code: "LP12B01B", program: "Little Pioneers", level: "Primary 12B" },
  { id: "lla-lp09a02a", schoolId: "lla", code: "LP09A02A", program: "Little Pioneers", level: "Primary 9A" },
  { id: "lla-tn07b01c", schoolId: "lla", code: "TN07B01C", program: "Teen Navigators", level: "Pre-Intermediate" },
  { id: "lla-tn11a02b", schoolId: "lla", code: "TN11A02B", program: "Teen Navigators", level: "Intermediate" },
  // SJS — Cambridge YL names and short codes
  { id: "sjs-starters", schoolId: "sjs", code: "STARTERS", program: "Cambridge Young Learners", level: "Pre-A1" },
  { id: "sjs-movers", schoolId: "sjs", code: "MOVERS", program: "Cambridge Young Learners", level: "A1" },
  { id: "sjs-flyers", schoolId: "sjs", code: "FLYERS", program: "Cambridge Young Learners", level: "A2" },
  { id: "sjs-sj3", schoolId: "sjs", code: "SJ3", program: "Junior English", level: "Grade 3" },
  { id: "sjs-sj5", schoolId: "sjs", code: "SJ5", program: "Junior English", level: "Grade 5" },
  // IEC — adult exam prep
  { id: "iec-il102", schoolId: "iec", code: "IL102", program: "IELTS Foundation", level: "Band 4.5–5.5" },
  { id: "iec-il401", schoolId: "iec", code: "IL401", program: "IELTS Advanced", level: "Band 6.5+" },
  { id: "iec-it201", schoolId: "iec", code: "IT201", program: "TOEIC Intensive", level: "600+" },
  // VHB — grade-class grammar
  { id: "vhb-3c3", schoolId: "vhb", code: "3C3", program: "General English K-12", level: "Grade 3" },
  { id: "vhb-4a1", schoolId: "vhb", code: "4A1", program: "General English K-12", level: "Grade 4" },
  { id: "vhb-5b2", schoolId: "vhb", code: "5B2", program: "General English K-12", level: "Grade 5" },
];
