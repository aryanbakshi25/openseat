import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { getReservationsProvider } from "@/lib/providers/reservations";
import { getCached, setCache } from "@/lib/cache";
import type { AvailabilityData } from "@/lib/types";

const querySchema = z.object({
  librarySlug: z.string().min(1),
  startISO: z.iso.datetime(),
  endISO: z.iso.datetime(),
});

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing or invalid query params (librarySlug, startISO, endISO)" },
      { status: 400 },
    );
  }

  const { librarySlug, startISO, endISO } = parsed.data;
  const cacheKey = `availability:${librarySlug}:${startISO}:${endISO}`;
  const cached = getCached<AvailabilityData>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const provider = getReservationsProvider(librarySlug);
  if (!provider) {
    return NextResponse.json(
      { error: "No reservation data available for this library" },
      { status: 404 },
    );
  }

  try {
    const data = await provider.getAvailability(
      librarySlug,
      new Date(startISO),
      new Date(endISO),
    );
    setCache(cacheKey, data);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Availability error:", err);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 },
    );
  }
}
