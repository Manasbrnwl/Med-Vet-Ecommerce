export const SRC = {
  host: "127.0.0.1",
  port: 3307,
  user: "root",
  password: "root",
  database: "wp",
};

export const PREFIX = "wp_";
export const t = (name: string) => `${PREFIX}${name}`;

export const STRIP_DIVI = (html: string | null): string | null => {
  if (!html) return null;
  return html
    .replace(/\[\/?(et_pb|et_multi_frame|et_slider)[^\]]*\]/g, "")
    .replace(/<!--\s*wp:[^>]*-->/g, "")
    .replace(/<!--\s*\/wp:[^>]*-->/g, "")
    .trim() || null;
};

export const STATUS_MAP: Record<string, string> = {
  "wc-pending":    "PENDING",
  "wc-processing": "PROCESSING",
  "wc-on-hold":   "ON_HOLD",
  "wc-completed": "COMPLETED",
  "wc-cancelled": "CANCELLED",
  "wc-refunded":  "REFUNDED",
  "wc-failed":    "FAILED",
  pending:        "PENDING",
  processing:     "PROCESSING",
  completed:      "COMPLETED",
  cancelled:      "CANCELLED",
};
