import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Do not advertise the framework in response headers.
  poweredByHeader: false,
  // Self-contained server output for the container image.
  output: "standalone",
};

export default nextConfig;
