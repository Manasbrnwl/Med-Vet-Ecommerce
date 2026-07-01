import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { mailerEnabled, sendPasswordReset } from "../lib/mailer.js";

const router = Router();

function signToken(payload: { id: number; email: string; role: string }): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "30d" });
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
const registerSchema = z.object({
  email:     z.string().email(),
  password:  z.string().min(8),
  firstName: z.string().min(1).optional(),
  lastName:  z.string().min(1).optional(),
});

router.post("/register", async (req, res) => {
  const body = registerSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.flatten() }); return; }
  const { email, password, firstName, lastName } = body.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) { res.status(409).json({ error: "Email already registered" }); return; }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, firstName: firstName ?? null, lastName: lastName ?? null, role: "CUSTOMER" },
  });

  res.status(201).json({
    token: signToken({ id: user.id, email: user.email, role: user.role }),
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
    },
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string(),
});

router.post("/login", async (req, res) => {
  const body = loginSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.flatten() }); return; }
  const { email, password } = body.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) { res.status(401).json({ error: "Invalid credentials" }); return; }

  if (!user.passwordHash) {
    // Legacy WP user — password not yet reset
    res.status(403).json({ error: "Please reset your password to continue" }); return;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) { res.status(401).json({ error: "Invalid credentials" }); return; }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  res.json({
    token: signToken({ id: user.id, email: user.email, role: user.role }),
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
    },
  });
});

// ── POST /api/auth/reset-request ─────────────────────────────────────────────
// Emails a reset link containing a signed, 1-hour token to the registered address.
router.post("/reset-request", async (req, res) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  // Always return the same message to avoid email enumeration.
  const generic = { message: "If that email exists, a reset link has been sent." };
  if (!user) { res.json(generic); return; }

  const resetToken = jwt.sign({ id: user.id, purpose: "reset" }, process.env.JWT_SECRET!, { expiresIn: "1h" });
  const base = (process.env.SITE_URL ?? "https://vetbuddy-ecom-shop.pages.dev").replace(/\/$/, "");
  const link = `${base}/reset?token=${resetToken}`;

  if (mailerEnabled) {
    try {
      await sendPasswordReset(user.email, link);
      res.json(generic);
      return;
    } catch (e) {
      console.error("[reset] email send failed:", e);
      // In production, surface a soft error; in dev, fall through to the token.
      if (process.env.NODE_ENV === "production") {
        res.status(502).json({ error: "Could not send the reset email right now. Please try again shortly." });
        return;
      }
    }
  }
  // Dev/no-SMTP fallback: return the token so the flow is still testable.
  res.json({ ...generic, dev_token: resetToken });
});

// ── POST /api/auth/reset-confirm ──────────────────────────────────────────────
router.post("/reset-confirm", async (req, res) => {
  const { token, password } = z.object({ token: z.string(), password: z.string().min(8) }).parse(req.body);
  let payload: { id: number; purpose: string };
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as typeof payload;
  } catch {
    res.status(400).json({ error: "Invalid or expired token" }); return;
  }
  if (payload.purpose !== "reset") { res.status(400).json({ error: "Invalid token" }); return; }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.update({ where: { id: payload.id }, data: { passwordHash, legacyHash: null } });
  res.json({
    token: signToken({ id: user.id, email: user.email, role: user.role }),
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
    },
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, createdAt: true },
  });
  res.json(user);
});

export default router;
