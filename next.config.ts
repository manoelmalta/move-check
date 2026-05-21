import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use the Vercel adapter when building on Vercel (VERCEL=1 is set automatically).
  // Without this, Next.js 16 produces Node.js-server output that Vercel's edge
  // cannot route, causing 404 for every path.
  ...(process.env.VERCEL ? { adapterPath: "@vercel/next" } : {}),
};

export default nextConfig;
