/** @type {import('next').NextConfig} */
const nextConfig = {
  // Native modules must not be bundled.
  serverExternalPackages: ["better-sqlite3", "sharp"],
  experimental: {
    serverActions: {
      // Product photos are uploaded through Server Actions (limit in src/lib/uploads.ts is 6 MB).
      bodySizeLimit: "7mb",
    },
  },
  poweredByHeader: false,
};

export default nextConfig;
