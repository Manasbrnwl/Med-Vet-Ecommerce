import crypto from "crypto";

const SECRET = process.env.WC_WEBHOOK_SECRET ?? "";

/** Verifies the `X-WC-Webhook-Signature` header WooCommerce sends with every delivery — base64 HMAC-SHA256 of the raw request body, keyed with the webhook's secret. */
export function verifyWooSignature(rawBody: Buffer | undefined, signature: string | undefined): boolean {
  if (!SECRET || !rawBody || !signature) return false;
  const expected = crypto.createHmac("sha256", SECRET).update(rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
