import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { DaySchedule, WeekSchedule } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAY_LABELS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export { DAY_LABELS, DAY_LABELS_FULL };

export function formatHourLabel(h: number): string {
  if (h === 0 || h === 24) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

export function formatDaySchedule(ds: DaySchedule): string {
  if (!ds) return "Closed";
  const [open, close] = ds;
  if (open === 0 && close === 24) return "24 hours";
  return `${formatHourLabel(open)} – ${formatHourLabel(close)}`;
}

export function getTodaySchedule(hours: WeekSchedule | null): { label: string; isOpen: boolean } {
  if (!hours) return { label: "Hours not set", isOpen: false };

  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const ds = hours[dayOfWeek];

  if (ds) {
    const [open, close] = ds;
    if (open === 0 && close === 24) return { label: "Open 24 hours", isOpen: true };

    if (currentHour >= open && currentHour < close) {
      return { label: `Open ${formatHourLabel(open)} – ${formatHourLabel(close)}`, isOpen: true };
    }

    if (currentHour < open) {
      return { label: `Closed until ${formatHourLabel(open)}`, isOpen: false };
    }
  }

  const nextOpen = findNextOpen(hours, dayOfWeek);
  if (nextOpen) return { label: `Closed until ${nextOpen}`, isOpen: false };
  return { label: "Closed", isOpen: false };
}

function findNextOpen(hours: WeekSchedule, today: number): string | null {
  for (let offset = 1; offset <= 7; offset++) {
    const idx = (today + offset) % 7;
    const ds = hours[idx];
    if (ds) {
      const dayName = DAY_LABELS[idx];
      return `${dayName} ${formatHourLabel(ds[0])}`;
    }
  }
  return null;
}
