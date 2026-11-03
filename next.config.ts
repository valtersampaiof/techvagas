import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacotes do banco online (Turso): ficam fora do pacote do site, como o próprio Prisma.
  serverExternalPackages: ["@prisma/adapter-libsql", "@libsql/client", "libsql"],
  // Cabeçalhos de segurança em todas as páginas. Sem política de scripts de propósito: o Next precisa de scripts embutidos.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
        ],
      },
    ];
  },
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
