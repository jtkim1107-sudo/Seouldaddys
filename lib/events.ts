import type { CalEvent } from "./types";

// 해당 날짜(YYYY-MM-DD)에 이 일정이 표시되어야 하는지 (기간·반복 일정 포함)
export function occursOn(e: CalEvent, date: string): boolean {
  // 기간 일정 (예: 전시회 4일)
  const end = e.end_date && e.end_date > e.date ? e.end_date : e.date;
  if (date >= e.date && date <= end) return true;
  if (end !== e.date) return false; // 기간 일정은 반복하지 않음
  // 반복 일정
  const repeat = e.repeat || "";
  if (!repeat || date < e.date) return false;
  const start = new Date(e.date + "T00:00:00");
  const target = new Date(date + "T00:00:00");
  if (repeat === "weekly") return start.getDay() === target.getDay();
  if (repeat === "monthly") return start.getDate() === target.getDate();
  return false;
}

// 오늘부터 days일 안에 있는 일정 발생 목록 (반복 일정 전개)
export function upcomingOccurrences(
  events: CalEvent[],
  todayStr: string,
  days = 14
): { event: CalEvent; date: string }[] {
  const out: { event: CalEvent; date: string }[] = [];
  const seen = new Set<string>(); // 기간 일정은 가장 가까운 날짜 한 번만
  const base = new Date(todayStr + "T00:00:00");
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    for (const e of events) {
      if (!occursOn(e, ds)) continue;
      const isRange = Boolean(e.end_date && e.end_date > e.date);
      if (isRange) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
      }
      out.push({ event: e, date: ds });
    }
  }
  out.sort((a, b) => (a.date + a.event.time).localeCompare(b.date + b.event.time));
  return out;
}
