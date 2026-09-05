import { describe, expect, it } from "vitest";
import {
  formatBannerLine,
  formatClassIdentity,
  formatCoTeacher,
  formatCurriculum,
  formatLocation,
  formatWeekCode,
} from "./lessonPresentation";

describe("formatWeekCode", () => {
  it("expands W6D1 into week and day", () => {
    expect(formatWeekCode("W6D1")).toBe("Week 6 · Day 1");
  });

  it("expands a week-only code", () => {
    expect(formatWeekCode("W12")).toBe("Week 12");
  });

  it("expands a day-only syllabus locator", () => {
    expect(formatWeekCode("D7")).toBe("Day 7");
  });

  it("treats a bare number as a week", () => {
    expect(formatWeekCode("2")).toBe("Week 2");
  });

  it("returns unknown shapes unchanged", () => {
    expect(formatWeekCode("term-3")).toBe("term-3");
  });

  it("returns null for empty input", () => {
    expect(formatWeekCode("")).toBeNull();
    expect(formatWeekCode(undefined)).toBeNull();
  });
});

describe("formatCurriculum", () => {
  it("expands the Prepare 5 textbook shorthand", () => {
    expect(formatCurriculum("Prepare 5: U15 pp.88–89")).toBe(
      "Prepare 5 · Unit 15 · pages 88–89"
    );
  });

  it("expands a unit followed by a skill label", () => {
    expect(formatCurriculum("Solutions Int: U7 Grammar — reported speech")).toBe(
      "Solutions Int · Unit 7 · Grammar — reported speech"
    );
  });

  it("keeps a plus-suffix on the unit", () => {
    expect(formatCurriculum("Vocabulary for IELTS: U8 + collocation bank")).toBe(
      "Vocabulary for IELTS · Unit 8 + collocation bank"
    );
  });

  it("turns a colon into a separator when there is no unit", () => {
    expect(formatCurriculum("Speaking: classroom objects")).toBe(
      "Speaking · classroom objects"
    );
  });

  it("leaves an already-plain string alone", () => {
    expect(formatCurriculum("Phonics review: long vowels")).toBe(
      "Phonics review · long vowels"
    );
  });
});

describe("formatClassIdentity", () => {
  it("labels the class code and keeps program and level", () => {
    expect(
      formatClassIdentity({
        program: "Little Pioneers",
        code: "LP12B01B",
        level: "Primary 12B",
      })
    ).toEqual({
      program: "Little Pioneers",
      classLabel: "Class LP12B01B",
      level: "Primary 12B",
    });
  });

  it("omits a Class label when there is no code", () => {
    expect(formatClassIdentity({ program: "Little Pioneers" }).classLabel).toBeNull();
  });
});

describe("formatLocation", () => {
  it("labels campus and room and uses the full school name", () => {
    expect(
      formatLocation({
        schoolName: "Outeref",
        campusName: "OT03",
        roomName: "205",
      })
    ).toBe("Outeref · Campus OT03 · Room 205");
  });

  it("skips missing pieces", () => {
    expect(formatLocation({ schoolName: "Outeref", roomName: "205" })).toBe(
      "Outeref · Room 205"
    );
  });
});

describe("formatCoTeacher", () => {
  it("labels the co-teacher initials", () => {
    expect(formatCoTeacher("DHT")).toBe("Co-teacher DHT");
  });
});

describe("formatBannerLine", () => {
  it("builds the operational next-lesson sentence", () => {
    expect(
      formatBannerLine({
        program: "Little Pioneers",
        code: "LP12B01B",
        schoolName: "Outeref",
        campusName: "OT03",
        roomName: "205",
      })
    ).toBe("Little Pioneers · Class LP12B01B · Outeref · Campus OT03 · Room 205");
  });
});
