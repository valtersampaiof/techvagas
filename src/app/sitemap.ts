import type { MetadataRoute } from "next";
import { TRILHAS } from "@/lib/dados/trilhas";
import { enderecoDoSite } from "@/lib/email";

/** Só as páginas fixas e as trilhas: as milhares de vagas mudam toda hora, então ficam de fora. */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = enderecoDoSite();
  const fixas = [
    { caminho: "", prioridade: 1 },
    { caminho: "/vagas", prioridade: 0.9 },
    { caminho: "/cursos", prioridade: 0.8 },
    { caminho: "/trilhas", prioridade: 0.7 },
    { caminho: "/mercado", prioridade: 0.7 },
    { caminho: "/privacidade", prioridade: 0.2 },
  ];
  return [
    ...fixas.map((p) => ({ url: `${site}${p.caminho}`, priority: p.prioridade })),
    ...TRILHAS.map((t) => ({ url: `${site}/trilhas/${t.slug}`, priority: 0.6 })),
  ];
}
