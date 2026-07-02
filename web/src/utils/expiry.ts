// Product expiry helpers — shared by ProductCard, ProductDetail, Cart, Admin.
// Source dates are month-only for most stock (stored as end-of-month), so we
// treat anything strictly before "now" as expired.

export type ExpiryStatus = "expired" | "soon" | "ok";

/** Within this many days of expiry → "expiring soon". */
const SOON_DAYS = 90;

export function expiryStatus(date: string | null | undefined): ExpiryStatus | null {
  if (!date) return null;
  const t = new Date(date).getTime();
  if (isNaN(t)) return null;
  const ms = t - Date.now();
  if (ms < 0) return "expired";
  if (ms < SOON_DAYS * 24 * 60 * 60 * 1000) return "soon";
  return "ok";
}

export function isExpired(date: string | null | undefined): boolean {
  return expiryStatus(date) === "expired";
}

/** "28 Feb 2027" (en-SG medium) or null. */
export function formatExpiry(date: string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-SG", { dateStyle: "medium" });
}
