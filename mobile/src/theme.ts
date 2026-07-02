export const colors = {
  brand: "#0f766e",
  brandDark: "#115e59",
  bg: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  muted: "#64748b",
  faint: "#94a3b8",
  border: "#e2e8f0",
  danger: "#dc2626",
  success: "#059669",
  successBg: "#ecfdf5",
  warning: "#d97706",
};

export const money = (n: number, _cur = "SGD") => `S$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;

/** Decode common HTML entities left over from the WordPress data (e.g. &amp; → &). */
export const decode = (s?: string | null): string =>
  (s ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&#8217;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();

// ── Product expiry helpers (mirror web/src/utils/expiry.ts) ───────────────────
export type ExpiryStatus = "expired" | "soon" | "ok";
const SOON_DAYS = 90;

export const expiryStatus = (date?: string | null): ExpiryStatus | null => {
  if (!date) return null;
  const t = new Date(date).getTime();
  if (isNaN(t)) return null;
  const ms = t - Date.now();
  if (ms < 0) return "expired";
  if (ms < SOON_DAYS * 24 * 60 * 60 * 1000) return "soon";
  return "ok";
};

export const isExpired = (date?: string | null): boolean => expiryStatus(date) === "expired";

/** "28 Feb 2027" or "" */
export const formatExpiry = (date?: string | null): string => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
};

export const statusColor = (status: string): string => {
  switch (status) {
    case "COMPLETED":
    case "PROCESSING":
      return colors.success;
    case "PENDING":
    case "ON_HOLD":
      return "#d97706";
    case "CANCELLED":
    case "FAILED":
    case "REFUNDED":
      return colors.danger;
    default:
      return colors.muted;
  }
};
