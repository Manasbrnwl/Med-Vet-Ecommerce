import type { RequestHandler } from "express";
import { prisma } from "../db.js";

interface RedirectRule {
  source: string;
  target: string;
  code: number;
}

let rules: RedirectRule[] = [];
let loaded = false;

async function loadRules() {
  if (loaded) return;
  try {
    rules = await prisma.redirect.findMany({
      select: { source: true, target: true, code: true },
    });
    loaded = true;
  } catch (err) {
    // Never let a DB hiccup / missing table crash the request pipeline.
    // Leave loaded=false so a later request can retry once the DB is reachable.
    req_log_once(err);
    rules = [];
  }
}

let warned = false;
function req_log_once(err: unknown) {
  if (warned) return;
  warned = true;
  console.error("[redirects] failed to load rules; serving without redirects:", err);
}

export const redirectMiddleware: RequestHandler = async (req, res, next) => {
  await loadRules();
  const path = req.path.replace(/\/?$/, "/").replace(/^\/\//, "/"); // normalise trailing slash
  const match = rules.find(
    (r) => r.source === req.path || r.source === path || r.source === req.path + "/"
  );
  if (match) {
    return res.redirect(match.code, match.target);
  }
  next();
};
