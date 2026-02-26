import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getServiceClient } from "@/lib/supabase/server";
import { getCached, setCache } from "@/lib/cache";
import type { Room } from "@/lib/types";

const querySchema = z.object({
  librarySlug: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing or invalid librarySlug query param" },
      { status: 400 },
    );
  }

  const { librarySlug } = parsed.data;
  const cacheKey = `rooms:${librarySlug}`;
  const cached = getCached<Room[]>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const supabase = getServiceClient();

    const { data: lib } = await supabase
      .from("libraries")
      .select("id")
      .eq("slug", librarySlug)
      .single();

    if (!lib) {
      return NextResponse.json({ error: "Library not found" }, { status: 404 });
    }

    const { data: rooms, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("library_id", lib.id)
      .order("display_name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    setCache(cacheKey, rooms);
    return NextResponse.json(rooms);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 },
    );
  }
}
