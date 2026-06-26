import { unserialize } from "php-serialize";

export function tryUnserialize(val: string | null): unknown {
  if (!val) return val;
  if (!val.startsWith("a:") && !val.startsWith("O:") && !val.startsWith("s:") && !val.startsWith("i:") && !val.startsWith("d:")) return val;
  try { return unserialize(val); } catch { return val; }
}

export function dec(val: string | null): number {
  if (!val) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}
