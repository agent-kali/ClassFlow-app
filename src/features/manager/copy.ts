import type { Locale } from "@/features/landing/locale";

export interface ManagerChromeCopy {
  schedule: string;
  mySchedule: string;
  week: string;
  day: string;
  weekHint: string;
  dayHint: string;
  viewGroup: string;
  previousWeek: string;
  nextWeek: string;
  previousDay: string;
  nextDay: string;
  today: string;
  thisWeek: string;
  filters: string;
  closeFilters: string;
  importSchedule: string;
  importShort: string;
  newLesson: string;
  noConflicts: string;
  clearFocus: string;
  doubleBooking: string;
  doubleBookings: string;
  travelGap: string;
  travelGaps: string;
  schools: string;
  teachers: string;
  showAll: string;
  selectAll: string;
  clear: string;
  afternoon: string;
  evening: string;
  weekSchedule: string;
  dayOfWeek: string;
  themeDark: string;
  themeLight: string;
  switchToTheme: (target: "dark" | "light") => string;
  noLessons: string;
  doubleBookingCard: string;
  tightTravelCard: (gapMin: number) => string;
  tightTravelShort: string;
  payWeekOf: string;
  deliveredHours: string;
  thisWeeksPay: string;
  ariaShowDoubleBooking: string;
  ariaShowFirstDoubleBookings: (count: number) => string;
  ariaShowNextDoubleBooking: (current: number, total: number) => string;
  ariaShowTravelGap: string;
  ariaShowFirstTravelGaps: (count: number) => string;
  ariaShowNextTravelGap: (current: number, total: number) => string;
  dayTabAria: (weekday: string, count: number, issue: string | null) => string;
}

const en: ManagerChromeCopy = {
  schedule: "Schedule",
  mySchedule: "My schedule",
  week: "Week",
  day: "Day",
  weekHint: "Scan the whole week",
  dayHint: "Inspect one day's exact timing",
  viewGroup: "Schedule view",
  previousWeek: "Previous week",
  nextWeek: "Next week",
  previousDay: "Previous day",
  nextDay: "Next day",
  today: "Today",
  thisWeek: "This week",
  filters: "Filters",
  closeFilters: "Close filters",
  importSchedule: "Import a schedule",
  importShort: "Import",
  newLesson: "New lesson",
  noConflicts: "No conflicts",
  clearFocus: "Clear focus",
  doubleBooking: "double-booking",
  doubleBookings: "double-bookings",
  travelGap: "tight travel gap",
  travelGaps: "tight travel gaps",
  schools: "Schools",
  teachers: "Teachers",
  showAll: "Show all",
  selectAll: "Select all",
  clear: "Clear",
  afternoon: "AFTERNOON",
  evening: "EVENING",
  weekSchedule: "Week schedule",
  dayOfWeek: "Day",
  themeDark: "Dark",
  themeLight: "Light",
  switchToTheme: (target) => `Switch to ${target} theme`,
  noLessons: "No lessons",
  doubleBookingCard: "Double booking",
  tightTravelCard: (gapMin) => `Tight travel (${gapMin} min)`,
  tightTravelShort: "Tight travel",
  payWeekOf: "Pay, week of",
  deliveredHours: "delivered hours only",
  thisWeeksPay: "This week's pay by teacher",
  ariaShowDoubleBooking: "Show double-booking on the schedule",
  ariaShowFirstDoubleBookings: (count) => `Show first of ${count} double-bookings`,
  ariaShowNextDoubleBooking: (current, total) =>
    `Show next double-booking, currently ${current} of ${total}`,
  ariaShowTravelGap: "Show tight travel gap on the schedule",
  ariaShowFirstTravelGaps: (count) => `Show first of ${count} tight travel gaps`,
  ariaShowNextTravelGap: (current, total) =>
    `Show next tight travel gap, currently ${current} of ${total}`,
  dayTabAria: (weekday, count, issue) =>
    `${weekday}, ${count} lesson${count === 1 ? "" : "s"}` + (issue ? `, has a ${issue}` : ""),
};

const vi: ManagerChromeCopy = {
  schedule: "Lịch",
  mySchedule: "Lịch của tôi",
  week: "Tuần",
  day: "Ngày",
  weekHint: "Xem cả tuần",
  dayHint: "Xem giờ chính xác trong một ngày",
  viewGroup: "Chế độ lịch",
  previousWeek: "Tuần trước",
  nextWeek: "Tuần sau",
  previousDay: "Ngày trước",
  nextDay: "Ngày sau",
  today: "Hôm nay",
  thisWeek: "Tuần này",
  filters: "Bộ lọc",
  closeFilters: "Đóng bộ lọc",
  importSchedule: "Nhập lịch học",
  importShort: "Nhập",
  newLesson: "Buổi mới",
  noConflicts: "Không xung đột",
  clearFocus: "Bỏ tiêu điểm",
  doubleBooking: "trùng lịch",
  doubleBookings: "trùng lịch",
  travelGap: "khoảng di chuyển sát",
  travelGaps: "khoảng di chuyển sát",
  schools: "Trường",
  teachers: "Giáo viên",
  showAll: "Hiện tất cả",
  selectAll: "Chọn tất cả",
  clear: "Xóa",
  afternoon: "CHIỀU",
  evening: "TỐI",
  weekSchedule: "Lịch tuần",
  dayOfWeek: "Ngày",
  themeDark: "Tối",
  themeLight: "Sáng",
  switchToTheme: (target) =>
    target === "dark" ? "Chuyển sang giao diện tối" : "Chuyển sang giao diện sáng",
  noLessons: "Không có buổi",
  doubleBookingCard: "Trùng lịch",
  tightTravelCard: (gapMin) => `Di chuyển sát (${gapMin} phút)`,
  tightTravelShort: "Di chuyển sát",
  payWeekOf: "Lương, tuần",
  deliveredHours: "chỉ giờ đã dạy",
  thisWeeksPay: "Lương tuần theo giáo viên",
  ariaShowDoubleBooking: "Hiện trùng lịch trên lịch",
  ariaShowFirstDoubleBookings: (count) => `Hiện trùng lịch đầu tiên trong ${count}`,
  ariaShowNextDoubleBooking: (current, total) =>
    `Hiện trùng lịch tiếp theo, đang ${current} / ${total}`,
  ariaShowTravelGap: "Hiện khoảng di chuyển sát trên lịch",
  ariaShowFirstTravelGaps: (count) => `Hiện khoảng di chuyển sát đầu tiên trong ${count}`,
  ariaShowNextTravelGap: (current, total) =>
    `Hiện khoảng di chuyển sát tiếp theo, đang ${current} / ${total}`,
  dayTabAria: (weekday, count, issue) =>
    `${weekday}, ${count} buổi` + (issue ? `, có ${issue}` : ""),
};

export const managerCopy: Record<Locale, ManagerChromeCopy> = { en, vi };

export function getManagerCopy(locale: Locale): ManagerChromeCopy {
  return managerCopy[locale];
}
