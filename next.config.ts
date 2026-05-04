import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Opt-in proxy: keep Next.js mock API as default to avoid hard failure
    // when external backend is unavailable.
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    const useNestApi = process.env.NEXT_PUBLIC_USE_NEST_API === "true";

    if (backendUrl && useNestApi) {
      return [
        {
          source: "/api/:path*",
          destination: `${backendUrl}/api/:path*`,
        },
      ];
    }

    return [];
  },
};

export default nextConfig;
