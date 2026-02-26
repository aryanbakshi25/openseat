import type { CrowdingData, CrowdLevel, CrowdingProvider, SubAreaCrowding } from "@/lib/types";

/**
 * Deterministic hash for a string -> number in [0, 1).
 * Gives stable "random" values per slug so demo data doesn't flicker.
 */
function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h % 100) / 100;
}

function levelFromPercent(pct: number): CrowdLevel {
  if (pct < 40) return "Not Busy";
  if (pct < 70) return "Busy";
  return "Very Busy";
}

const SUB_AREAS: Record<string, string[]> = {
  hsse: ["1st Floor", "2nd Floor", "3rd Floor", "Collaborative Study Center"],
  walc: ["1st Floor", "2nd Floor", "3rd Floor", "Active Learning Center"],
  hicks: ["Basement", "1st Floor", "2nd Floor"],
  stew: ["1st Floor", "Digital Humanities Studio"],
  math: ["1st Floor", "2nd Floor"],
  kran: ["1st Floor", "2nd Floor"],
  vetmed: ["1st Floor Study Area"],
};

export class MockCrowdingProvider implements CrowdingProvider {
  async getCrowding(librarySlug: string): Promise<CrowdingData> {
    const areas = SUB_AREAS[librarySlug] ?? ["Main Floor"];

    const subAreas: SubAreaCrowding[] = areas.map((name) => {
      const seed = hashSeed(`${librarySlug}:${name}`);
      const pct = Math.round(seed * 85 + 5); // 5-90%
      return { name, occupancyPercent: pct, level: levelFromPercent(pct) };
    });

    const overallPercent = Math.round(
      subAreas.reduce((s, a) => s + a.occupancyPercent, 0) / subAreas.length,
    );

    return {
      librarySlug,
      overallPercent,
      level: levelFromPercent(overallPercent),
      subAreas,
      lastUpdated: new Date().toISOString(),
    };
  }
}
