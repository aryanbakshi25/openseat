// ── Core domain types ──

export interface Library {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

export interface Room {
  id: string;
  library_id: string;
  display_name: string;
  floor: string | null;
  capacity: number | null;
  external_system: string | null;
  external_id: string | null;
  is_reservable: boolean;
}

export interface OpenSpaceLocation {
  id: string;
  library_id: string;
  display_name: string;
  external_system: string | null;
  external_id: string | null;
  capacity: number | null;
}

// ── Provider response types ──

export type CrowdLevel = "Not Busy" | "Busy" | "Very Busy";

export interface SubAreaCrowding {
  name: string;
  occupancyPercent: number;
  level: CrowdLevel;
  count?: number;
  children?: SubAreaCrowding[];
}

export interface CrowdingData {
  librarySlug: string;
  overallPercent: number;
  level: CrowdLevel;
  count?: number;
  subAreas: SubAreaCrowding[];
  lastUpdated: string; // ISO string
}

export interface RoomAvailability {
  roomId: string;
  displayName: string;
  floor: string | null;
  capacity: number | null;
  isAvailable: boolean;
  nextChangeAt: string | null; // ISO string — when status flips
  bookingUrl: string | null;
  locationId: number | null;
}

export interface AvailabilityData {
  librarySlug: string;
  windowStart: string; // ISO
  windowEnd: string; // ISO
  rooms: RoomAvailability[];
}

export interface DayHours {
  date: string; // YYYY-MM-DD
  hours: string; // e.g. "8am – 12am", "Closed"
  isClosed: boolean;
  note?: string; // e.g. "Spring Break", "24/7 access with PUID"
}

export interface LibraryHours {
  slug: string;
  locationName: string;
  days: DayHours[];
}

// ── Provider interfaces ──

export interface CrowdingProvider {
  getCrowding(librarySlug: string): Promise<CrowdingData>;
}

export interface ReservationsProvider {
  getAvailability(
    librarySlug: string,
    start: Date,
    end: Date,
  ): Promise<AvailabilityData>;
}
