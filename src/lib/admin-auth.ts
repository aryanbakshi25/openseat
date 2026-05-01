/**
 * Shared admin authentication utilities.
 * Uses a simple password-gate approach:
 *  - Staff enters ADMIN_PASSWORD on the login page
 *  - A SHA-256 HMAC token is stored in an HttpOnly cookie
 *  - Middleware + API routes verify the cookie
 *
 * This will be replaced with Purdue CAS/SSO when IT access is granted.
 */

import { createHmac } from "crypto";

export const ADMIN_COOKIE = "admin_session";

const HMAC_KEY = "openseat-session-key";

export function deriveToken(password: string): string {
  return createHmac("sha256", HMAC_KEY).update(password).digest("hex");
}
