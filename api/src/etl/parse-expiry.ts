/**
 * Parse the messy WooCommerce expiry / batch strings that live in a variant's
 * `_variation_description` postmeta (e.g. "…\r\nBatch: 240215\r\nExpiry: 02/2027")
 * or the numeric `date_expires` postmeta (unix seconds).
 *
 * Month-only sources are stored as the LAST day of that month ("valid through
 * the end of the month"). Dates use noon UTC so display in SG time (UTC+8)
 * never slips to the previous day.
 */

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function endOfMonth(year: number, month1: number): Date {
  // month1 = 1..12 → last day of that month (Date.UTC day 0 = last day of prev month)
  return new Date(Date.UTC(year, month1, 0, 12, 0, 0));
}
function exactDay(year: number, month1: number, day: number): Date {
  return new Date(Date.UTC(year, month1 - 1, day, 12, 0, 0));
}
function sane(d: Date | null): Date | null {
  if (!d || isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  return y >= 2000 && y <= 2100 ? d : null;
}

/** Extract an expiry Date from a raw meta string; null if nothing parseable. */
export function parseExpiry(input: string | null | undefined): Date | null {
  if (!input) return null;
  let s = String(input).trim();

  // pure unix timestamp (date_expires)
  if (/^\d{9,11}$/.test(s)) return sane(new Date(parseInt(s, 10) * 1000));

  // if there's an "Expiry:" label, keep only what follows it
  const label = s.match(/expiry\s*:?\s*(.+)$/is);
  if (label) s = label[1];
  // normalise literal "\r\n" escapes and real newlines to spaces
  s = s.replace(/\\r|\\n|\\t/g, " ").replace(/[\r\n\t]/g, " ").trim();

  // DD Mon YYYY  → 31 Oct 2027  (try before "Mon YYYY")
  let m = s.match(/\b(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(\d{4})\b/);
  if (m) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
    const day = +m[1];
    if (mon && day >= 1 && day <= 31) return sane(exactDay(+m[3], mon, day));
  }
  // Mon YYYY  → Oct 2027  (month-only → end of month)
  m = s.match(/\b([A-Za-z]{3,})\.?\s+(\d{4})\b/);
  if (m) {
    const mon = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mon) return sane(endOfMonth(+m[2], mon));
  }
  // DD/MM/YYYY  → 31/12/2027  (try before "MM/YYYY")
  m = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (m) {
    const day = +m[1], mon = +m[2];
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) return sane(exactDay(+m[3], mon, day));
  }
  // MM/YYYY  → 02/2027  (month-only → end of month)
  m = s.match(/\b(\d{1,2})\/(\d{4})\b/);
  if (m) {
    const mon = +m[1];
    if (mon >= 1 && mon <= 12) return sane(endOfMonth(+m[2], mon));
  }
  // MM/YY  → 03/25  (2-digit year, month-only → end of month)
  m = s.match(/\b(\d{1,2})\/(\d{2})\b/);
  if (m) {
    const mon = +m[1];
    if (mon >= 1 && mon <= 12) return sane(endOfMonth(2000 + +m[2], mon));
  }
  // YYYY-MM-DD  (defensive)
  m = s.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) {
    const mon = +m[2], day = +m[3];
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) return sane(exactDay(+m[1], mon, day));
  }
  return null;
}

/** Extract a batch/lot number from a "…Batch: <x>…" string; null if absent. */
export function parseBatch(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = String(input).match(/batch\s*:?\s*([^\r\n\\]+?)\s*(?:\\r|\\n|[\r\n]|expiry|$)/i);
  if (!m) return null;
  const b = m[1].trim().replace(/['"]+$/g, "").trim();
  return b && b.length <= 60 ? b : null;
}
