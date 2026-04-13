import type { AvailabilityData, ReservationsProvider, RoomAvailability } from "@/lib/types";
import { getServiceClient } from "@/lib/supabase/server";

/**
 * Deterministic seeded pseudo-random using the room ID.
 */
function seededRandom(seed: string, offset: number): number {
  let h = 0;
  const str = seed + String(offset);
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h % 100) / 100;
}

export class MockReservationsProvider implements ReservationsProvider {
  async getAvailability(
    librarySlug: string,
    start: Date,
    end: Date,
  ): Promise<AvailabilityData> {
    const supabase = getServiceClient();

    // Get library id
    const { data: lib } = await supabase
      .from("libraries")
      .select("id")
      .eq("slug", librarySlug)
      .single();

    if (!lib) {
      return {
        librarySlug,
        windowStart: start.toISOString(),
        windowEnd: end.toISOString(),
        rooms: [],
      };
    }

    const { data: rooms } = await supabase
      .from("rooms")
      .select("*")
      .eq("library_id", lib.id)
      .eq("is_reservable", true)
      .order("display_name");

    const roomAvailabilities: RoomAvailability[] = (rooms ?? []).map((room) => {
      const rand = seededRandom(room.id, start.getHours());
      const isAvailable = rand > 0.4; // ~60% available

      // Generate a realistic next-change time
      let nextChangeAt: string | null = null;
      if (!isAvailable) {
        const minutesUntilFree = Math.round(rand * 90 + 15); // 15-105 min
        const changeDate = new Date(start.getTime() + minutesUntilFree * 60_000);
        nextChangeAt = changeDate.toISOString();
      } else {
        // Available now, but reserved later
        const minutesUntilReserved = Math.round(rand * 120 + 30); // 30-150 min
        const changeDate = new Date(start.getTime() + minutesUntilReserved * 60_000);
        nextChangeAt = changeDate.toISOString();
      }

      return {
        roomId: room.id,
        displayName: room.display_name,
        floor: room.floor,
        capacity: room.capacity,
        isAvailable,
        nextChangeAt,
        bookingUrl: null,
        locationId: null,
      };
    });

    return {
      librarySlug,
      windowStart: start.toISOString(),
      windowEnd: end.toISOString(),
      rooms: roomAvailabilities,
    };
  }
}
