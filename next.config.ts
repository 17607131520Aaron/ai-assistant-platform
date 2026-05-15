import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import type { NextConfig } from "next";

const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
const appEnvFile = `.env.${appEnv}`;

if (existsSync(appEnvFile)) {
  const envConfig = parseEnv(readFileSync(appEnvFile, "utf8"));

  for (const [key, value] of Object.entries(envConfig)) {
    process.env[key] = value;
  }
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
  typedRoutes: true,
  poweredByHeader: false,
  compress: true,
  crossOrigin: "anonymous",
  output: "standalone",
  cacheComponents: true,
  logging: {
    fetches: {
      fullUrl: true, // 显示完整的fetch请求URL，方便调试
    },
  },

  // ✅ 图片优化
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.example.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
  },

  serverExternalPackages: ["bcrypt"],
  async rewrites() {
    const apiProxyTarget = process.env.NEXT_PUBLIC_API_PROXY_TARGET;
    console.log("====================================");
    console.log(apiProxyTarget, "apiProxyTarget");
    console.log("====================================");

    if (!apiProxyTarget) {
      if (appEnv !== "production") {
        console.warn(
          `NEXT_PUBLIC_API_PROXY_TARGET is not set in ${appEnvFile}; /api rewrites are disabled.`,
        );
        return [];
      }

      throw new Error(
        `请在 ${appEnvFile} 中设置 NEXT_PUBLIC_API_PROXY_TARGET 环境变量！`,
      );
    }

    return {
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${apiProxyTarget}/:path*`,
        },
      ],
    };
  },

  async headers() {
    return [
      {
        // 静态API响应缓存策略
        source: "/api/:path((?!auth|login|register|me).*)",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
          },
        ],
      },
      {
        // 全局安全头
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  experimental: {
    typedEnv: true,
    proxyTimeout: 30000, // 30秒代理超时
  },
};

export default nextConfig;
