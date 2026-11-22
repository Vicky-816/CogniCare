import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { agentUpgrade: "security" },
  // The patient and caregiver areas became patient mode (/play) and the family area (/family).
  async redirects() {
    return [
      { source: "/patient/:path*", destination: "/play", permanent: false },
      { source: "/caregiver/:path*", destination: "/family", permanent: false },
    ];
  },
  turbopack: {
    // Pin the project folder as the root. Without this, Next.js may pick up a
    // stray package-lock.json in a parent folder (e.g. your home folder) and
    // print a warning.
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
