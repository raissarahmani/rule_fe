import type { NextConfig } from "next";

const nextConfig: NextConfig = {
      basePath: "/rule",
      output: "standalone",

      reactCompiler: true,

      experimental: {
            serverActions: {
                  allowedOrigins: [
                        process.env.NEXT_PUBLIC_BASE_URL
                              ? new URL(process.env.NEXT_PUBLIC_BASE_URL).host
                              : "localhost:8080",
                  ],
            },
      },

      images: {
            remotePatterns: [
                  {
                        protocol: "https",
                        hostname: "**",
                  },
            ],
      },
};

export default nextConfig;
