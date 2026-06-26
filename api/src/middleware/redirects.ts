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
  rules = await prisma.redirect.findMany({
    select: { source: true, target: true, code: true },
  });
  loaded = true;
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
