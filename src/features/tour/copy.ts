import type { Locale } from "@/features/landing/locale";

export interface TourCopy {
  progress: string;
  next: string;
  back: string;
  skip: string;
  reset: string;
  finish: string;
  openTeacher: string;
  steps: [
    { title: string; body: string },
    { title: string; body: string },
    { title: string; body: string },
  ];
}

const en: TourCopy = {
  progress: "Demo {n} of 3",
  next: "Next",
  back: "Back",
  skip: "Skip tour",
  reset: "Reset demo",
  finish: "Done",
  openTeacher: "Open teacher view",
  steps: [
    {
      title: "Import inconsistent school data",
      body: "Open Import a schedule to inspect a partner spreadsheet and the column mapping into the canonical Lesson model. Confirming import appends real lessons to this week.",
    },
    {
      title: "Edit a lesson and watch impact",
      body: "Select the highlighted LP12B01B lesson. Change its time or status to see schedule warnings and pay update.",
    },
    {
      title: "See the teacher schedule",
      body: "The teacher view is read-only and shares the same lesson store. Open it to see status, location, duration, and earnings in USD and VND.",
    },
  ],
};

const vi: TourCopy = {
  progress: "Demo {n} / 3",
  next: "Tiếp",
  back: "Quay lại",
  skip: "Bỏ qua hướng dẫn",
  reset: "Đặt lại demo",
  finish: "Xong",
  openTeacher: "Mở góc giáo viên",
  steps: [
    {
      title: "Nhập dữ liệu trường không đồng nhất",
      body: "Mở Import a schedule để xem bảng tính đối tác và ánh xạ cột vào mô hình Lesson chuẩn. Xác nhận import sẽ thêm buổi học thật vào tuần này.",
    },
    {
      title: "Sửa một buổi học và xem tác động",
      body: "Chọn buổi LP12B01B được đánh dấu. Đổi thời gian hoặc trạng thái để xem cảnh báo lịch và thù lao được cập nhật.",
    },
    {
      title: "Xem lịch giáo viên",
      body: "Góc giáo viên chỉ đọc và dùng chung store buổi học. Mở để thấy trạng thái, địa điểm, thời lượng và thù lao bằng USD và VND.",
    },
  ],
};

export const tourCopy: Record<Locale, TourCopy> = { en, vi };

export function getTourCopy(locale: Locale): TourCopy {
  return tourCopy[locale];
}

export function formatTourProgress(template: string, n: number): string {
  return template.replace("{n}", String(n));
}
