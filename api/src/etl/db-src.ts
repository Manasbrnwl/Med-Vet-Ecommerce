import mysql from "mysql2/promise";
import { SRC } from "./config.js";

let pool: mysql.Pool | null = null;

export function src(): mysql.Pool {
  if (!pool) pool = mysql.createPool({ ...SRC, connectionLimit: 5, namedPlaceholders: true });
  return pool;
}

export async function rows<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
  const [r] = await src().query<mysql.RowDataPacket[]>(sql, params);
  return r as T[];
}

export async function closeSrc(): Promise<void> {
  if (pool) { await pool.end(); pool = null; }
}

/** Fetch postmeta for a set of post IDs as map: postId → {metaKey → metaValue} */
export async function fetchMeta(ids: number[]): Promise<Map<number, Record<string, string>>> {
  if (!ids.length) return new Map();
  const r = await rows<{ post_id: number; meta_key: string; meta_value: string }>(
    `SELECT post_id, meta_key, meta_value FROM wp_postmeta WHERE post_id IN (?) AND meta_value IS NOT NULL`,
    [ids]
  );
  const map = new Map<number, Record<string, string>>();
  for (const { post_id, meta_key, meta_value } of r) {
    if (!map.has(post_id)) map.set(post_id, {});
    map.get(post_id)![meta_key] = meta_value;
  }
  return map;
}
