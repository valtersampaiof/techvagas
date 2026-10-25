/**
 * Fontes como a Gupy publicam vagas de toda a América Latina. Estas funções reconhecem o que está escrito em
 * espanhol, para a vaga não aparecer num site brasileiro. Texto em português ou em inglês passa.
 */
const SO_PORTUGUES = /\b(você|não|também|nossa|nosso|nossos|são|está|estamos|conhecimentos|atividades|benefícios|graduação|formação|vaga)\b/gi;
const SO_ESPANHOL =
  /\b(usted|nuestro|nuestra|nuestros|años|también|experiencia|conocimientos|ofrecemos|buscamos|desarrollador|desarrolladora|desarrollo|trabajo|equipo|puesto|estudios|empleo|beneficios|somos)\b/gi;

const contar = (texto: string, regex: RegExp) => texto.match(regex)?.length ?? 0;

export function sinaisDeIdioma(texto: string): { portugues: number; espanhol: number } {
  return { portugues: contar(texto, SO_PORTUGUES), espanhol: contar(texto, SO_ESPANHOL) };
}

/** O anúncio está em espanhol (e não em português)? */
export function escritoEmEspanhol(texto: string): boolean {
  const { portugues, espanhol } = sinaisDeIdioma(texto);
  return (espanhol >= 2 && espanhol > portugues) || (espanhol >= 1 && portugues === 0);
}
