import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getCrowdingProvider } from "@/lib/providers/crowding";
import { getCached, setCache } from "@/lib/cache";
import type { CrowdingData } from "@/lib/types";

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
  const cacheKey = `crowding:${librarySlug}`;
  const cached = getCached<CrowdingData>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const provider = getCrowdingProvider(librarySlug);
  if (!provider) {
    return NextResponse.json(
      { error: "No crowding data available for this library" },
      { status: 404 },
    );
  }

  try {
    const data = await provider.getCrowding(librarySlug);
    setCache(cacheKey, data);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch crowding data" },
      { status: 500 },
    );
  }
}
