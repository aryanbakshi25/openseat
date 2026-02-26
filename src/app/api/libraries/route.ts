import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import { getCached, setCache } from "@/lib/cache";
import type { Library } from "@/lib/types";

export async function GET() {
  const cacheKey = "libraries:all";
  const cached = getCached<Library[]>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("libraries")
      .select("*")
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    setCache(cacheKey, data);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch libraries" },
      { status: 500 },
    );
  }
}
