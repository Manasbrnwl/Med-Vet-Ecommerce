import crypto from "crypto";

const BASE = process.env.HITPAY_API_URL ?? "https://api.hit-pay.com/v1";
const KEY  = process.env.HITPAY_API_KEY ?? "";
const SALT = process.env.HITPAY_SALT ?? "";

export interface PaymentParams {
  amount: number;
  currency: string;
  name: string;
  email: string;
  phone?: string;
  reference: string;  // our internal order ID
  redirectUrl: string;
  webhookUrl: string;
}

export async function createPaymentRequest(params: PaymentParams): Promise<{ url: string; paymentId: string }> {
  if (!KEY) throw new Error("HITPAY_API_KEY not configured");

  const body = new URLSearchParams({
    amount: params.amount.toFixed(2),
    currency: params.currency,
    name: params.name,
    email: params.email,
    reference_number: params.reference,
    redirect_url: params.redirectUrl,
    webhook: params.webhookUrl,
    ...(params.phone ? { phone: params.phone } : {}),
  });

  const res = await fetch(`${BASE}/payment-requests`, {
    method: "POST",
    headers: { "X-BUSINESS-API-KEY": KEY, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HitPay error ${res.status}: ${text}`);
  }

  const data = await res.json() as { url: string; id: string };
  return { url: data.url, paymentId: data.id };
}

export function verifyWebhookSignature(payload: Record<string, string>, hmac: string): boolean {
  if (!SALT) return false;
  const sorted = Object.keys(payload)
    .filter((k) => k !== "hmac")
    .sort()
    .map((k) => `${k}${payload[k]}`)
    .join("");
  const expected = crypto.createHmac("sha256", SALT).update(sorted).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hmac));
}
