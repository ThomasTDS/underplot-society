import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Do not advertise the framework in response headers.
  poweredByHeader: false,
  // Self-contained server output for the container image.
  output: "standalone",
  // Do not let `next dev` write instruction files into the project.
  agentRules: false,
  experimental: {
    // The root layout lives under [lang], so unmatched URLs need their own 404 document.
    globalNotFound: true,
  },
};

export default nextConfig;
