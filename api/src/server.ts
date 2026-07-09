import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { join } from "path";
import { fileURLToPath, URL } from "url";
import { existsSync } from "fs";
import { prisma } from "./db.js";
import { redirectMiddleware } from "./middleware/redirects.js";
import catalogRouter  from "./routes/catalog.js";
import authRouter     from "./routes/auth.js";
import accountRouter  from "./routes/account.js";
import checkoutRouter from "./routes/checkout.js";
import adminRouter    from "./routes/admin.js";
import seoRouter      from "./routes/seo.js";
import webhooksRouter from "./routes/webhooks.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({
  origin: !corsOrigin || corsOrigin === "*"
    ? "*"
    : corsOrigin.split(",").map((s) => s.trim()).filter(Boolean),
}));
app.use(pinoHttp());

// ── Static media (extracted from .wpress) ─────────────────────────────────────
// __dirname = api/src/ (dev) or /app/dist/ (prod) → one level up = api/ or /app/
app.use(express.static(join(__dirname, "..", "public"), {
  maxAge: "30d",
  immutable: true,
  fallthrough: true,
}));

// ── SPA static (production: web/dist built by vite build) ─────────────────────
// dev: api/web/dist — doesn't exist, existsSync → false, Vite serves frontend
// prod Docker: /app/dist/../web/dist = /app/web/dist ✓
const webDist = join(__dirname, "..", "web", "dist");
if (existsSync(webDist)) {
  app.use(express.static(webDist, { fallthrough: true }));
}

// ── Legacy WordPress redirects (from Redirect table) ──────────────────────────
app.use(redirectMiddleware);

// ── SEO: sitemap.xml + robots.txt ─────────────────────────────────────────────
app.use(seoRouter);

// Raw body needed for webhook HMAC verification
app.use("/api/checkout/webhook", express.raw({ type: "*/*" }), (req, _res, next) => {
  if (Buffer.isBuffer(req.body)) {
    try { req.body = Object.fromEntries(new URLSearchParams(req.body.toString())); } catch { req.body = {}; }
  }
  next();
});

// `verify` captures the exact raw bytes alongside normal JSON parsing, needed to check
// the WooCommerce webhook HMAC signature (which is computed over the raw request body).
app.use(express.json({
  limit: "2mb",
  verify: (req, _res, buf) => { (req as express.Request & { rawBody?: Buffer }).rawBody = buf; },
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api",          catalogRouter);
app.use("/api/auth",     authRouter);
app.use("/api/account",  accountRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/admin",    adminRouter);
app.use("/api/webhooks", webhooksRouter);

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  const products = await prisma.product.count().catch(() => null);
  res.json({ ok: true, products });
});

// ── SPA fallback (serve index.html for all non-API routes in production) ───────
if (existsSync(webDist)) {
  app.use((_req, res) => res.sendFile(join(webDist, "index.html")));
} else {
  app.use((_req, res) => res.status(404).json({ error: "Not found" }));
}

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`API listening on :${port}`));
