import type { FonteExterna } from "../tipos";
import { adzuna } from "./adzuna";
import { fontesDeCarreiras } from "./carreiras";
import { github } from "./github";
import { gupy } from "./gupy";
import { jooble } from "./jooble";
import { remotive } from "./remotive";

/** A ordem importa: quando a mesma vaga vem de duas fontes, vale a da que aparece primeiro (a da própria empresa). */
export const FONTES: FonteExterna[] = [...fontesDeCarreiras, gupy, adzuna, jooble, remotive, github];
