import type { ReservationsProvider } from "@/lib/types";
import { LibCalProvider, hasLibCalMapping } from "./libcal";

let libCalProvider: LibCalProvider | null = null;

/**
 * Returns the LibCal provider for libraries it covers,
 * or null for libraries without LibCal spaces.
 */
export function getReservationsProvider(librarySlug: string): ReservationsProvider | null {
  const clientId = process.env.LIBCAL_CLIENT_ID;
  const clientSecret = process.env.LIBCAL_CLIENT_SECRET;

  if (clientId && clientSecret && hasLibCalMapping(librarySlug)) {
    if (!libCalProvider) {
      libCalProvider = new LibCalProvider(clientId, clientSecret);
    }
    return libCalProvider;
  }

  return null;
}
