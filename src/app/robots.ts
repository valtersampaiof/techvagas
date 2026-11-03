import type { MetadataRoute } from "next";
import { enderecoDoSite } from "@/lib/email";

/** Páginas pessoais ou de ação não precisam aparecer em buscadores. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/perfil", "/alertas", "/salvas", "/entrar", "/cadastrar", "/esqueci-senha", "/redefinir-senha/", "/confirmar-email/"],
    },
    sitemap: `${enderecoDoSite()}/sitemap.xml`,
  };
}
