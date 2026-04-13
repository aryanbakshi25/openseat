/**
 * Shared admin authentication utilities.
 * Uses a simple password-gate approach:
 *  - Staff enters ADMIN_PASSWORD on the login page
 *  - A derived token is stored in an HttpOnly cookie
 *  - Middleware + API routes verify the cookie
 *
 * This will be replaced with Purdue CAS/SSO when IT access is granted.
 */

export const ADMIN_COOKIE = "admin_session";

export function deriveToken(password: string): string {
  return btoa(`openseat-admin:${password}`);
}
