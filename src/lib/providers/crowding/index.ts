import type { CrowdingProvider } from "@/lib/types";
import { OccuspaceProvider, hasOccuspaceMapping } from "./occuspace";

let occuspaceProvider: OccuspaceProvider | null = null;

/**
 * Returns the Occuspace provider for libraries it covers,
 * or null for libraries without sensors.
 */
export function getCrowdingProvider(librarySlug: string): CrowdingProvider | null {
  const token = process.env.OCCUSPACE_API_TOKEN;

  if (token && hasOccuspaceMapping(librarySlug)) {
    if (!occuspaceProvider) {
      occuspaceProvider = new OccuspaceProvider(token);
    }
    return occuspaceProvider;
  }

  return null;
}
