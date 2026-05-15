import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
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
    if (!process.env.NEXT_PUBLIC_API_PROXY_TARGET) {
      throw new Error("请设置NEXT_PUBLIC_API_PROXY_TARGET环境变量！");
    }

    return {
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${process.env.NEXT_PUBLIC_API_PROXY_TARGET}/:path*`,
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
    typedRoutes: true,
    proxyTimeout: 30000, // 30秒代理超时
  },
};

export default nextConfig;
