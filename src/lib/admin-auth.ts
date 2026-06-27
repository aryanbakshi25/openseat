/**
 * Shared admin authentication utilities.
 * Uses a simple password-gate approach:
 *  - Staff enters ADMIN_PASSWORD on the login page
 *  - A SHA-256 HMAC token is stored in an HttpOnly cookie
 *  - Middleware + API routes verify the cookie
 *
 * This will be replaced with Purdue CAS/SSO when IT access is granted.
 */

export const ADMIN_COOKIE = "admin_session";

export async function deriveToken(password: string): Promise<string> {
  const hmacKey = process.env.ADMIN_SESSION_SECRET ?? password;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(hmacKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(password));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
