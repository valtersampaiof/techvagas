import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacotes do banco online (Turso): ficam fora do pacote do site, como o próprio Prisma.
  serverExternalPackages: ["@prisma/adapter-libsql", "@libsql/client", "libsql"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
