import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Disable Turbopack for production builds — SWC parser issue with complex spreadsheet component
    resolveAlias: {},
  },
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    optimizePackageImports: [
      "lucide-react",
      "@tanstack/react-query",
      "react-hot-toast",
      "clsx",
      "tailwind-merge",
    ],
  },
  webpack: (config, { isServer }) => {
    // Exclude heavy Prisma binaries from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "@prisma/client": false,
        ".prisma/client": false,
      };
    }
    return config;
  },
};

export default nextConfig;
