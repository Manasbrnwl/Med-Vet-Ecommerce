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
