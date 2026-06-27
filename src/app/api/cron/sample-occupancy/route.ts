import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

const OCCUSPACE_BASE = "https://api.occuspace.io/v1";

const SLUG_TO_LOCATION_ID: Record<string, number> = {
  hsse: 986,
  walc: 985,
  hicks: 989,
  math: 988,
  kran: 987,
  vetmed: 990,
  avtech: 991,
};

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.OCCUSPACE_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "External service not configured" },
      { status: 500 },
    );
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const hourOfDay = now.getHours();

  const results: { slug: string; percent: number; count: number | null }[] = [];
  const errors: string[] = [];

  await Promise.all(
    Object.entries(SLUG_TO_LOCATION_ID).map(async ([slug, locationId]) => {
      try {
        const res = await fetch(`${OCCUSPACE_BASE}/locations/${locationId}/now`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          errors.push(`${slug}: HTTP ${res.status}`);
          return;
        }
        const json = await res.json();
        const pct = Math.round((json.data?.percentage ?? 0) * 100);
        const count = json.data?.count ?? null;
        results.push({ slug, percent: pct, count });
      } catch (err) {
        errors.push(`${slug}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }),
  );

  if (results.length === 0) {
    return NextResponse.json(
      { error: "No data collected", details: errors },
      { status: 500 },
    );
  }

  try {
    const supabase = getServiceClient();
    const rows = results.map((r) => ({
      library_slug: r.slug,
      recorded_at: now.toISOString(),
      occupancy_percent: r.percent,
      count: r.count,
      day_of_week: dayOfWeek,
      hour_of_day: hourOfDay,
    }));

    const { error: insertError } = await supabase
      .from("occupancy_snapshots")
      .insert(rows);

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      sampled: results.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to store snapshots" },
      { status: 500 },
    );
  }
}
