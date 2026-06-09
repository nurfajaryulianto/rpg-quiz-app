import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/get-ip
 * Returns the real client IP address as seen by the server.
 * Reads standard proxy headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP).
 * Falls back to "unknown" if no header is present (e.g. local dev without a proxy).
 */
export async function GET(req: NextRequest) {
  // Cloudflare
  const cf = req.headers.get("cf-connecting-ip");
  // Standard reverse proxy / load balancer (first IP in the chain is the real client)
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  // Nginx / other
  const realIp = req.headers.get("x-real-ip");

  const ip = cf ?? forwarded ?? realIp ?? "unknown";

  return NextResponse.json({ ip });
}
