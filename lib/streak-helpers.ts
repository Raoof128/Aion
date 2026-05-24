// lib/streak-helpers.ts
import type { StreakDayRecord } from "./types";

export type WeekDayStatus = "active" | "frozen" | "missed" | "today" | "future";

export interface WeekDay {
  date: string;
  status: WeekDayStatus;
}

// Returns ISO week Monday "YYYY-MM-DD" for a given "YYYY-MM-DD".
export function isoWeekStart(localDate: string): string {
  const d = new Date(localDate + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

// Builds a 7-day array for the week containing `weekStart`.
// `today` and `weekStart` come from the server response — never computed client-side.
export function buildWeekDays(
  today: string,
  weekStart: string,
  days: StreakDayRecord[],
): WeekDay[] {
  const result: WeekDay[] = [];
  const weekStartDate = new Date(weekStart + "T00:00:00Z");
  const statusMap = new Map(days.map((d) => [d.local_date, d.status]));

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate);
    d.setUTCDate(weekStartDate.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);

    if (dateStr > today) {
      result.push({ date: dateStr, status: "future" });
    } else if (dateStr === today) {
      const todayStatus = statusMap.get(dateStr);
      result.push({ date: dateStr, status: todayStatus ?? "today" });
    } else {
      result.push({ date: dateStr, status: statusMap.get(dateStr) ?? "missed" });
    }
  }
  return result;
}
