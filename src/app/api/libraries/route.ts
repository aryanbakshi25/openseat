import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { getCached, setCache } from "@/lib/cache";
import type { Library } from "@/lib/types";

const SLUG_ORDER: Record<string, number> = {
  walc: 0,
  hsse: 1,
  hicks: 2,
  kran: 3,
  math: 4,
  vetmed: 5,
  avtech: 6,
};

export async function GET() {
  const cacheKey = "libraries:all";
  const cached = getCached<Library[]>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("libraries")
      .select("id, slug, name, hours");

    if (error) {
      console.error("Libraries fetch error:", error.message);
      return NextResponse.json({ error: "Failed to fetch libraries" }, { status: 500 });
    }

    const sorted = (data ?? []).sort(
      (a, b) => (SLUG_ORDER[a.slug] ?? 99) - (SLUG_ORDER[b.slug] ?? 99),
    );

    setCache(cacheKey, sorted);
    return NextResponse.json(sorted);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch libraries" },
      { status: 500 },
    );
  }
}
