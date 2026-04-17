import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const OCCUSPACE_BASE = "https://api.occuspace.io/v1";

const SLUG_TO_LOCATION_ID: Record<string, number> = {
  hsse: 986,
  walc: 985,
  hicks: 989,
  math: 988,
  kran: 987,
  vetmed: 990,
};

import type { DaySchedule, WeekSchedule } from "@/lib/types";

// Populated at request time from the DB; used by filter and recommendation functions.
let operationalHours: Record<string, WeekSchedule> = {};

function isWithinOperationalHours(slug: string, dayOfWeek: number, hour: number): boolean {
  const schedule = operationalHours[slug];
  if (!schedule) return true;
  const daySchedule = schedule[dayOfWeek];
  if (!daySchedule) return false;
  const [open, close] = daySchedule;
  return hour >= open && hour < close;
}

interface OccuspaceCount {
  normalizedDate: string;
  normalizedTime: string;
  percentage: number;
  count: number;
}

interface HourlyAvg {
  hour: number;
  avgPercent: number;
  avgCount: number;
  samples: number;
}

interface Recommendation {
  id: string;
  type: "close_early" | "open_later" | "low_traffic_day" | "low_traffic_period";
  library: string;
  title: string;
  summary: string;
  reasoning: string;
  confidence: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  data: {
    dayOfWeek?: number;
    dayName?: string;
    suggestedHour?: number;
    hourlyBreakdown?: HourlyAvg[];
    avgPercent?: number;
  };
}

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

function confidenceFromSamples(samples: number): "low" | "medium" | "high" {
  if (samples >= 100) return "high";
  if (samples >= 30) return "medium";
  return "low";
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function fetchOccuspaceHistory(
  token: string,
  locationId: number,
  startDate: string,
  endDate: string,
): Promise<OccuspaceCount[]> {
  try {
    const res = await fetch(
      `${OCCUSPACE_BASE}/locations/${locationId}/counts?start=${startDate}&end=${endDate}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.counts ?? [];
  } catch {
    return [];
  }
}

interface DayHourData {
  dayOfWeek: number;
  hour: number;
  percent: number;
  count: number;
}

function getScheduleForSlug(slug: string): WeekSchedule | null {
  return operationalHours[slug] ?? null;
}

function generateRecommendations(
  allData: Map<string, DayHourData[]>,
  slugToName: Record<string, string>,
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const LOW_THRESHOLD = 5;

  const SKIP_RECOMMENDATIONS = new Set(["walc"]); // 24/7 libraries — no hour changes needed

  for (const [slug, dataPoints] of allData) {
    if (SKIP_RECOMMENDATIONS.has(slug)) continue;
    const libName = slugToName[slug] || slug.toUpperCase();
    const schedule = getScheduleForSlug(slug);

    for (let day = 0; day < 7; day++) {
      const daySchedule = schedule?.[day];
      if (!daySchedule) continue; // library is closed this day, skip

      const [currentOpen, currentClose] = daySchedule;
      const dayData = dataPoints.filter((d) => d.dayOfWeek === day);
      if (dayData.length < 5) continue;

      const hourlyMap = new Map<number, { totalPct: number; totalCount: number; n: number }>();
      for (const d of dayData) {
        const existing = hourlyMap.get(d.hour) ?? { totalPct: 0, totalCount: 0, n: 0 };
        existing.totalPct += d.percent;
        existing.totalCount += d.count;
        existing.n++;
        hourlyMap.set(d.hour, existing);
      }

      const hourlyAvgs: HourlyAvg[] = Array.from(hourlyMap.entries())
        .map(([hour, { totalPct, totalCount, n }]) => ({
          hour,
          avgPercent: Math.round(totalPct / n),
          avgCount: Math.round(totalCount / n),
          samples: n,
        }))
        .sort((a, b) => a.hour - b.hour);

      if (hourlyAvgs.length < 3) continue;

      const totalSamples = dayData.length;
      const dayName = DAY_NAMES[day];
      const confidence = confidenceFromSamples(totalSamples);
      const currentHoursStr = `${formatHour(currentOpen)}–${formatHour(currentClose > 23 ? 0 : currentClose)}`;

      // Full day low traffic
      const dayAvgPercent =
        hourlyAvgs.reduce((s, h) => s + h.avgPercent, 0) / hourlyAvgs.length;
      if (dayAvgPercent < 3 && hourlyAvgs.length >= 4) {
        recommendations.push({
          id: `${slug}-low-day-${day}`,
          type: "low_traffic_day",
          library: libName,
          title: `Consider closing ${libName} on ${dayName}s`,
          summary: `Average occupancy is only ${Math.round(dayAvgPercent)}% during operating hours (${currentHoursStr}) on ${dayName}s.`,
          reasoning: buildDayReasoning(libName, dayName, hourlyAvgs, dayAvgPercent, currentHoursStr),
          confidence,
          impact: "high",
          data: { dayOfWeek: day, dayName, avgPercent: dayAvgPercent, hourlyBreakdown: hourlyAvgs },
        });
        continue;
      }

      // Close early — only suggest if the library currently closes after 6pm
      if (currentClose > 18) {
        const eveningHours = hourlyAvgs.filter((h) => h.hour >= 18);
        if (eveningHours.length >= 2) {
          const firstLowHour = eveningHours.find((h) => h.avgPercent <= LOW_THRESHOLD);
          if (firstLowHour) {
            const allLowAfter = eveningHours
              .filter((h) => h.hour >= firstLowHour.hour)
              .every((h) => h.avgPercent <= LOW_THRESHOLD);

            if (allLowAfter) {
              const lastActiveHour = hourlyAvgs
                .filter((h) => h.hour < firstLowHour.hour && h.avgPercent > LOW_THRESHOLD)
                .pop();
              const suggestedClose = lastActiveHour ? lastActiveHour.hour + 1 : firstLowHour.hour;

              if (suggestedClose < currentClose) {
                const hoursSaved = currentClose - suggestedClose;
                recommendations.push({
                  id: `${slug}-close-early-${day}`,
                  type: "close_early",
                  library: libName,
                  title: `Close ${libName} at ${formatHour(suggestedClose)} on ${dayName}s (currently ${formatHour(currentClose > 23 ? 0 : currentClose)})`,
                  summary: `Occupancy drops below ${LOW_THRESHOLD}% after ${formatHour(firstLowHour.hour)} (avg ${firstLowHour.avgPercent}%). Would save ${hoursSaved}h of staffing.`,
                  reasoning: buildCloseEarlyReasoning(libName, dayName, suggestedClose, firstLowHour.hour, eveningHours, currentHoursStr),
                  confidence,
                  impact: hoursSaved >= 3 ? "high" : "medium",
                  data: { dayOfWeek: day, dayName, suggestedHour: suggestedClose, hourlyBreakdown: hourlyAvgs },
                });
              }
            }
          }
        }
      }

      // Open later — only suggest if there's room to shift from the current open time
      const morningHours = hourlyAvgs.filter((h) => h.hour >= currentOpen && h.hour <= currentOpen + 4);
      if (morningHours.length >= 2) {
        const lastLowMorning = morningHours.filter((h) => h.avgPercent <= LOW_THRESHOLD).pop();
        if (lastLowMorning && lastLowMorning.hour > currentOpen) {
          const allLowBefore = morningHours
            .filter((h) => h.hour <= lastLowMorning.hour)
            .every((h) => h.avgPercent <= LOW_THRESHOLD);

          if (allLowBefore) {
            const suggestedOpen = lastLowMorning.hour + 1;
            if (suggestedOpen > currentOpen) {
              const hoursSaved = suggestedOpen - currentOpen;
              recommendations.push({
                id: `${slug}-open-later-${day}`,
                type: "open_later",
                library: libName,
                title: `Open ${libName} at ${formatHour(suggestedOpen)} on ${dayName}s (currently ${formatHour(currentOpen)})`,
                summary: `Occupancy stays below ${LOW_THRESHOLD}% until ${formatHour(lastLowMorning.hour)} (avg ${lastLowMorning.avgPercent}%). Would save ${hoursSaved}h of staffing.`,
                reasoning: buildOpenLaterReasoning(libName, dayName, suggestedOpen, morningHours, currentHoursStr),
                confidence,
                impact: "low",
                data: { dayOfWeek: day, dayName, suggestedHour: suggestedOpen, hourlyBreakdown: hourlyAvgs },
              });
            }
          }
        }
      }
    }

    // Cross-weekday low traffic periods — only for libraries open past 8pm on weekdays
    const schedule_ = getScheduleForSlug(slug);
    const hasLateWeekdays = schedule_
      ? [1, 2, 3, 4, 5].some((d) => { const s = schedule_[d]; return s && s[1] > 20; })
      : false;

    if (hasLateWeekdays) {
      const weekdayData = dataPoints.filter((d) => d.dayOfWeek >= 1 && d.dayOfWeek <= 5);
      if (weekdayData.length >= 20) {
        const hourMap = new Map<number, { total: number; n: number }>();
        for (const d of weekdayData) {
          const existing = hourMap.get(d.hour) ?? { total: 0, n: 0 };
          existing.total += d.percent;
          existing.n++;
          hourMap.set(d.hour, existing);
        }

        const lateHours = Array.from(hourMap.entries())
          .filter(([hour]) => hour >= 20)
          .map(([hour, { total, n }]) => ({ hour, avg: Math.round(total / n), samples: n }))
          .filter((h) => h.avg <= LOW_THRESHOLD && h.samples >= 3);

        if (lateHours.length >= 2) {
          const earliest = lateHours[0];
          recommendations.push({
            id: `${slug}-weekday-close`,
            type: "low_traffic_period",
            library: libName,
            title: `${libName}: low traffic after ${formatHour(earliest.hour)} on weekdays`,
            summary: `Average weekday occupancy drops to ${earliest.avg}% by ${formatHour(earliest.hour)}.`,
            reasoning: buildWeekdayReasoning(libName, lateHours),
            confidence: confidenceFromSamples(weekdayData.length),
            impact: "medium",
            data: {
              suggestedHour: earliest.hour,
              hourlyBreakdown: lateHours.map((h) => ({ hour: h.hour, avgPercent: h.avg, avgCount: 0, samples: h.samples })),
            },
          });
        }
      }
    }
  }

  const impactOrder = { high: 0, medium: 1, low: 2 };
  const confOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort(
    (a, b) => impactOrder[a.impact] - impactOrder[b.impact] || confOrder[a.confidence] - confOrder[b.confidence],
  );

  return recommendations;
}

function buildDayReasoning(lib: string, day: string, hourly: HourlyAvg[], avgPct: number, currentHours: string): string {
  const peakHour = hourly.reduce((max, h) => (h.avgPercent > max.avgPercent ? h : max));
  return (
    `${lib} is currently open ${currentHours} on ${day}s but averages only ${Math.round(avgPct)}% occupancy during those hours. ` +
    `Even the busiest hour (${formatHour(peakHour.hour)}) only reaches ${peakHour.avgPercent}% on average. ` +
    `Based on ${hourly.reduce((s, h) => s + h.samples, 0)} data points from the past 4 weeks, keeping the library open on ${day}s ` +
    `provides minimal benefit relative to staffing costs. Consider redirecting ${day} users to nearby open libraries.`
  );
}

function buildCloseEarlyReasoning(lib: string, day: string, suggested: number, firstLow: number, evening: HourlyAvg[], currentHours: string): string {
  const lowHours = evening.filter((h) => h.hour >= firstLow);
  const details = lowHours.map((h) => `${formatHour(h.hour)}: ${h.avgPercent}% (${h.avgCount} people)`).join(", ");
  return (
    `${lib} is currently open ${currentHours} on ${day}s. ` +
    `Occupancy drops significantly in the evening — after ${formatHour(firstLow)}, it is consistently at or below 5%. ` +
    `Hourly breakdown: ${details}. ` +
    `Closing at ${formatHour(suggested)} instead would save ${evening.filter((h) => h.hour >= suggested).length} hours of staffing ` +
    `while affecting very few users (typically ${lowHours[0]?.avgCount ?? 0} or fewer people).`
  );
}

function buildOpenLaterReasoning(lib: string, day: string, suggested: number, morning: HourlyAvg[], currentHours: string): string {
  const lowHours = morning.filter((h) => h.hour < suggested);
  const details = lowHours.map((h) => `${formatHour(h.hour)}: ${h.avgPercent}% (${h.avgCount} people)`).join(", ");
  return (
    `${lib} is currently open ${currentHours} on ${day}s. ` +
    `Before ${formatHour(suggested)}, average occupancy stays at or below 5%. ` +
    `Morning breakdown: ${details}. ` +
    `Opening at ${formatHour(suggested)} instead would reduce staffing needs with minimal impact on users.`
  );
}

function buildWeekdayReasoning(lib: string, lateHours: { hour: number; avg: number; samples: number }[]): string {
  const details = lateHours.map((h) => `${formatHour(h.hour)}: ${h.avg}% avg (${h.samples} samples)`).join(", ");
  return (
    `Across all weekdays (Mon–Fri), ${lib} shows consistently low traffic in the late evening. ` +
    `Breakdown: ${details}. ` +
    `This pattern is stable across multiple weeks of data, suggesting these hours could be reduced ` +
    `without significantly impacting student access.`
  );
}

export async function GET() {
  const token = process.env.OCCUSPACE_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "OCCUSPACE_API_TOKEN not configured" },
      { status: 500 },
    );
  }

  try {
    // Fetch 4 weeks of historical data from Occuspace
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28);

    const startStr = toDateString(startDate);
    const endStr = toDateString(endDate);
    const daysCovered = 28;

    // Get library names and hours from Supabase
    const supabase = getServiceClient();
    const { data: libraries } = await supabase.from("libraries").select("slug, name, hours");
    const slugToName: Record<string, string> = {};
    operationalHours = {};
    for (const lib of libraries ?? []) {
      slugToName[lib.slug] = lib.name;
      if (lib.hours) operationalHours[lib.slug] = lib.hours as WeekSchedule;
    }

    // Fetch historical data for all libraries in parallel
    const allData = new Map<string, DayHourData[]>();
    let totalDataPoints = 0;

    await Promise.all(
      Object.entries(SLUG_TO_LOCATION_ID).map(async ([slug, locationId]) => {
        const counts = await fetchOccuspaceHistory(token, locationId, startStr, endStr);
        const parsed: DayHourData[] = counts
          .map((c) => {
            const date = new Date(`${c.normalizedDate}T${c.normalizedTime}`);
            return {
              dayOfWeek: date.getDay(),
              hour: date.getHours(),
              percent: Math.round(c.percentage * 100),
              count: c.count,
            };
          })
          .filter((d) => isWithinOperationalHours(slug, d.dayOfWeek, d.hour));
        allData.set(slug, parsed);
        totalDataPoints += parsed.length;
      }),
    );

    if (totalDataPoints < 48) {
      return NextResponse.json({
        status: "collecting",
        message: "Not enough historical data available from Occuspace.",
        snapshotCount: totalDataPoints,
        daysCovered: 0,
        firstDate: null,
        lastDate: null,
        recommendations: [],
      });
    }

    const recommendations = generateRecommendations(allData, slugToName);

    return NextResponse.json({
      status: "ready",
      snapshotCount: totalDataPoints,
      daysCovered,
      firstDate: startStr,
      lastDate: endStr,
      recommendations,
    });
  } catch (err) {
    console.error("Recommendations error:", err);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 },
    );
  }
}
