import type {
  CrowdingData,
  CrowdLevel,
  CrowdingProvider,
  SubAreaCrowding,
} from "@/lib/types";

const BASE_URL = "https://api.occuspace.io/v1";

/**
 * Maps library slugs to Occuspace location IDs.
 * Discovered via GET /locations with Grouping ID 950.
 */
const SLUG_TO_LOCATION_ID: Record<string, number> = {
  hsse: 986,
  walc: 985,
  hicks: 989,
  math: 988,
  kran: 987,
  vetmed: 990,
};

export function hasOccuspaceMapping(slug: string): boolean {
  return slug in SLUG_TO_LOCATION_ID;
}

interface OccuspaceChildCount {
  id: number;
  name: string;
  count: number;
  percentage: number;
  isActive: boolean;
}

interface OccuspaceNowResponse {
  message: string;
  data: {
    id: number;
    name: string;
    count: number;
    percentage: number;
    timestamp: string;
    isActive: boolean;
    childCounts: OccuspaceChildCount[] | null;
  };
}

function levelFromPercent(pct: number): CrowdLevel {
  if (pct < 40) return "Not Busy";
  if (pct < 70) return "Busy";
  return "Very Busy";
}

export class OccuspaceProvider implements CrowdingProvider {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async getCrowding(librarySlug: string): Promise<CrowdingData> {
    const locationId = SLUG_TO_LOCATION_ID[librarySlug];

    if (!locationId) {
      throw new Error(
        `No Occuspace location mapping for slug "${librarySlug}"`,
      );
    }

    const res = await fetch(`${BASE_URL}/locations/${locationId}/now`, {
      headers: { Authorization: `Bearer ${this.token}` },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(
        `Occuspace API error ${res.status}: ${await res.text()}`,
      );
    }

    const json: OccuspaceNowResponse = await res.json();
    const { data } = json;

    const overallPercent = Math.round(data.percentage * 100);

    const subAreas: SubAreaCrowding[] = (data.childCounts ?? [])
      .filter((child) => child.isActive)
      .map((child) => {
        const pct = Math.round(child.percentage * 100);
        return {
          name: child.name,
          occupancyPercent: pct,
          level: levelFromPercent(pct),
          count: child.count,
        };
      });

    return {
      librarySlug,
      overallPercent,
      level: levelFromPercent(overallPercent),
      count: data.count,
      subAreas,
      lastUpdated: data.timestamp,
    };
  }
}
