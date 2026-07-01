import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "ap-southeast-1";
const bucket = process.env.S3_BUCKET ?? "";
const mediaBase = (process.env.MEDIA_BASE_URL ?? "").replace(/\/$/, "");

export const s3Enabled = !!(bucket && mediaBase);

const client = new S3Client({ region });

/** Upload an admin-provided product image to S3; returns its CDN url. */
export async function uploadProductImage(buf: Buffer, filename: string, mime: string): Promise<{ key: string; url: string }> {
  if (!s3Enabled) throw new Error("Image storage is not configured");
  const safe = (filename || "image").toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-60);
  const rand = Math.random().toString(36).slice(2, 8);
  const key = `wp-content/uploads/admin/${Date.now()}-${rand}-${safe}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: mime || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return { key, url: `${mediaBase}/${key}` };
}

/** Best-effort delete of an object we previously uploaded (matched by CDN url prefix). */
export async function deleteObjectByUrl(url: string): Promise<void> {
  if (!s3Enabled || !url.startsWith(mediaBase + "/")) return;
  const key = url.slice(mediaBase.length + 1);
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    /* ignore */
  }
}
