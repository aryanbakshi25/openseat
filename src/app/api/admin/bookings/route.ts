import { NextRequest, NextResponse } from "next/server";
import {
  getAccessToken,
  LIBCAL_BASE_URL,
  SLUG_TO_LOCATION_IDS,
} from "@/lib/providers/reservations/libcal";

interface LibCalBookingFull {
  bookId: string;
  eid: number;
  lid: number;
  fromDate: string;
  toDate: string;
  status: string;
  item_name: string;
  firstName: string;
  lastName: string;
  email: string;
  account: string;
  location_name: string;
  created: string;
}

interface PatronLookup {
  patronType: string;
  status: string;
}

const VALID_PATRON_TYPES = new Set([
  "undergrad",
  "undergraduate",
  "grad",
  "graduate",
  "grad student",
  "graduate student",
]);

async function lookupPatron(username: string): Promise<PatronLookup | null> {
  const proxyUrl = process.env.ALMA_PROXY_URL;
  const apiKey = process.env.ALMA_PROXY_API_KEY;
  if (!proxyUrl || !apiKey) return null;

  try {
    const res = await fetch(
      `${proxyUrl}?username=${encodeURIComponent(username)}&apikey=${apiKey}`,
    );
    if (!res.ok) return null;
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return {
        patronType: data.patron_type ?? data.user_group ?? text.trim(),
        status: data.status ?? "Unknown",
      };
    } catch {
      return { patronType: text.trim(), status: "Unknown" };
    }
  } catch {
    return null;
  }
}

function classifyPatron(
  lookup: PatronLookup | null,
): "valid" | "review" | "invalid" | "unknown" {
  if (!lookup) return "unknown";
  if (lookup.patronType.toLowerCase().includes("not found")) return "invalid";
  const normalized = lookup.patronType.toLowerCase();
  if (VALID_PATRON_TYPES.has(normalized)) return "valid";
  if (normalized.includes("undergrad") || normalized.includes("grad"))
    return "valid";
  if (normalized.includes("staff")) return "review";
  return "review";
}

export interface AdminBooking {
  bookId: string;
  room: string;
  location: string;
  fromDate: string;
  toDate: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  status: string;
  created: string;
  patronType: string | null;
  patronStatus: string | null;
  classification: "valid" | "review" | "invalid" | "unknown";
}

const STATUS_FILTERS: Record<string, string[]> = {
  tentative: ["Mediated Tentative"],
  approved: ["Mediated Approved", "Confirmed"],
  denied: ["Mediated Denied", "Cancelled by Admin"],
  cancelled: ["Cancelled by User"],
};

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(req: NextRequest) {
  const clientId = process.env.LIBCAL_CLIENT_ID;
  const clientSecret = process.env.LIBCAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "LibCal credentials not configured" },
      { status: 500 },
    );
  }

  const statusFilter = req.nextUrl.searchParams.get("status") || "tentative";
  const days = Math.min(
    parseInt(req.nextUrl.searchParams.get("days") || "7", 10) || 7,
    30,
  );

  try {
    const token = await getAccessToken(clientId, clientSecret);
    const today = toDateString(new Date());

    const allLocationIds = Object.values(SLUG_TO_LOCATION_IDS).flat();

    const allBookings: LibCalBookingFull[] = [];
    await Promise.all(
      allLocationIds.map(async (lid) => {
        const res = await fetch(
          `${LIBCAL_BASE_URL}/space/bookings?lid=${lid}&date=${today}&days=${days}&limit=500&include_tentative=1&include_cancelled=1`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const text = await res.text();
        try {
          const bookings: LibCalBookingFull[] = JSON.parse(text);
          allBookings.push(...bookings);
        } catch {
          /* skip non-JSON */
        }
      }),
    );

    // Deduplicate by bookId (same booking can appear under multiple location IDs)
    const seen = new Set<string>();
    const deduped = allBookings.filter((b) => {
      if (seen.has(b.bookId)) return false;
      seen.add(b.bookId);
      return true;
    });

    const allowedStatuses =
      statusFilter === "all" ? null : STATUS_FILTERS[statusFilter];
    const filtered = allowedStatuses
      ? deduped.filter((b) => allowedStatuses.includes(b.status))
      : deduped;

    const enrichPending = statusFilter === "tentative" || statusFilter === "all";

    const enriched: AdminBooking[] = await Promise.all(
      filtered.map(async (b) => {
        const rawAccount = b.account || b.email || "";
        const username = rawAccount.replace(/@.*$/, "");

        const shouldLookup =
          enrichPending && b.status === "Mediated Tentative" && username;
        const lookup = shouldLookup ? await lookupPatron(username) : null;

        return {
          bookId: b.bookId,
          room: b.item_name,
          location: b.location_name || "",
          fromDate: b.fromDate,
          toDate: b.toDate,
          firstName: b.firstName || "",
          lastName: b.lastName || "",
          email: b.email || "",
          username,
          status: b.status,
          created: b.created || "",
          patronType: lookup?.patronType ?? null,
          patronStatus: lookup?.status ?? null,
          classification: shouldLookup ? classifyPatron(lookup) : "unknown",
        };
      }),
    );

    enriched.sort(
      (a, b) =>
        new Date(a.fromDate).getTime() - new Date(b.fromDate).getTime(),
    );

    // Group by location
    const grouped: Record<string, AdminBooking[]> = {};
    for (const booking of enriched) {
      const loc = booking.location || "Unknown";
      if (!grouped[loc]) grouped[loc] = [];
      grouped[loc].push(booking);
    }

    return NextResponse.json({ grouped, total: enriched.length });
  } catch (err) {
    console.error("Admin bookings error:", err);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 },
    );
  }
}
