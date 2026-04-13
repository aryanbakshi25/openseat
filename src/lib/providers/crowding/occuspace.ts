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

  private async fetchLocation(locationId: number): Promise<OccuspaceNowResponse> {
    const res = await fetch(`${BASE_URL}/locations/${locationId}/now`, {
      headers: { Authorization: `Bearer ${this.token}` },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      throw new Error(`Occuspace API error ${res.status}: ${await res.text()}`);
    }
    return res.json();
  }

  async getCrowding(librarySlug: string): Promise<CrowdingData> {
    const locationId = SLUG_TO_LOCATION_ID[librarySlug];

    if (!locationId) {
      throw new Error(
        `No Occuspace location mapping for slug "${librarySlug}"`,
      );
    }

    const json = await this.fetchLocation(locationId);
    const { data } = json;

    const overallPercent = Math.round(data.percentage * 100);

    const topChildren = (data.childCounts ?? []).filter((c) => c.isActive);

    // Fetch second-level children for each floor in parallel
    const subAreas: SubAreaCrowding[] = await Promise.all(
      topChildren.map(async (child) => {
        const pct = Math.round(child.percentage * 100);
        let children: SubAreaCrowding[] | undefined;

        try {
          const childJson = await this.fetchLocation(child.id);
          const grandChildren = (childJson.data.childCounts ?? []).filter((gc) => gc.isActive);
          if (grandChildren.length > 0) {
            children = grandChildren.map((gc) => {
              const gcPct = Math.round(gc.percentage * 100);
              return {
                name: gc.name,
                occupancyPercent: gcPct,
                level: levelFromPercent(gcPct),
                count: gc.count,
              };
            });
          }
        } catch {
          // If sub-area fetch fails, just show the floor without children
        }

        return {
          name: child.name,
          occupancyPercent: pct,
          level: levelFromPercent(pct),
          count: child.count,
          children,
        };
      }),
    );

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
