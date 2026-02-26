import type {
  AvailabilityData,
  ReservationsProvider,
  RoomAvailability,
} from "@/lib/types";

const BASE_URL = "https://calendar.lib.purdue.edu/api/1.1";

/**
 * Maps library slugs to LibCal location ID(s).
 * WALC has a second location (17792) for the Knowledge Lab / Podcast Studio.
 */
const SLUG_TO_LOCATION_IDS: Record<string, number[]> = {
  walc: [13748, 17792],
  hsse: [9178],
  kran: [9177],
  vetmed: [13749],
  math: [13750],
};

export function hasLibCalMapping(slug: string): boolean {
  return slug in SLUG_TO_LOCATION_IDS;
}

const ACTIVE_STATUSES = new Set([
  "Confirmed",
  "Mediated Approved",
  "Mediated Pending",
]);

// ── OAuth Token Management ──

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch(`${BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`LibCal OAuth error ${res.status}: ${await res.text()}`);
  }

  const data: { access_token: string; expires_in: number } = await res.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };

  return cachedToken.token;
}

// ── API Types ──

interface LibCalBooking {
  bookId: string;
  eid: number;
  lid: number;
  fromDate: string;
  toDate: string;
  status: string;
  item_name: string;
}

interface LibCalSpaceItem {
  id: number;
  name: string;
  capacity: number;
  zoneName: string;
}

// ── Provider ──

export class LibCalProvider implements ReservationsProvider {
  private clientId: string;
  private clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  private async fetch<T>(path: string): Promise<T> {
    const token = await getAccessToken(this.clientId, this.clientSecret);
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`LibCal API error ${res.status}: ${text}`);
    }
    try {
      return JSON.parse(text);
    } catch {
      return [] as unknown as T;
    }
  }

  async getAvailability(
    librarySlug: string,
    start: Date,
    end: Date,
  ): Promise<AvailabilityData> {
    const locationIds = SLUG_TO_LOCATION_IDS[librarySlug];
    if (!locationIds) {
      return { librarySlug, windowStart: start.toISOString(), windowEnd: end.toISOString(), rooms: [] };
    }

    const allItems: LibCalSpaceItem[] = [];
    const allBookings: LibCalBooking[] = [];

    const dateStr = toDateString(start);

    await Promise.all(
      locationIds.map(async (lid) => {
        const [items, bookings] = await Promise.all([
          this.fetch<LibCalSpaceItem[]>(`/space/items/${lid}`),
          this.fetch<LibCalBooking[]>(
            `/space/bookings?lid=${lid}&date=${dateStr}&days=1&limit=500&include_cancel=0&include_tentative=1`,
          ),
        ]);
        allItems.push(...items);
        allBookings.push(...bookings);
      }),
    );

    const activeBookings = allBookings.filter((b) => ACTIVE_STATUSES.has(b.status));

    const bookingsByRoom = new Map<number, LibCalBooking[]>();
    for (const b of activeBookings) {
      const list = bookingsByRoom.get(b.eid) ?? [];
      list.push(b);
      bookingsByRoom.set(b.eid, list);
    }

    const rooms: RoomAvailability[] = allItems.map((item) => {
      const roomBookings = (bookingsByRoom.get(item.id) ?? [])
        .sort((a, b) => new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime());

      const overlapping = roomBookings.find(
        (b) => new Date(b.fromDate) < end && new Date(b.toDate) > start,
      );

      const isAvailable = !overlapping;
      let nextChangeAt: string | null = null;

      if (isAvailable) {
        const nextBooking = roomBookings.find(
          (b) => new Date(b.fromDate) >= start,
        );
        if (nextBooking) {
          nextChangeAt = nextBooking.fromDate;
        }
      } else {
        nextChangeAt = overlapping!.toDate;
      }

      return {
        roomId: String(item.id),
        displayName: item.name,
        floor: item.zoneName || null,
        capacity: item.capacity ?? null,
        isAvailable,
        nextChangeAt,
      };
    });

    return {
      librarySlug,
      windowStart: start.toISOString(),
      windowEnd: end.toISOString(),
      rooms,
    };
  }
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
