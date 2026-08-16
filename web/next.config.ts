import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server with only the files it actually uses, so the
  // production image does not have to carry node_modules.
  output: "standalone",
};

export default nextConfig;
