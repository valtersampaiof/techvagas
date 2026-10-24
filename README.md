# TechVagas

Site de vagas de TI para jovens estudantes no Brasil (estágio, trainee e júnior). Além de buscar vagas, ele
compara o perfil do estudante com os requisitos de cada vaga e indica **cursos gratuitos e pagos, com certificado**,
para fechar o que falta.

Exemplo: a vaga pede *Segurança da Informação* e o estudante não tem → o site mostra "60% compatível — falta:
Segurança da Informação" e sugere, por exemplo, o **Certified in Cybersecurity (ISC2)** (gratuito) e o
**Certificado Profissional Google de Cibersegurança** (pago).

## Como rodar

```bash
npm install
cp .env.example .env        # troque SEGREDO_SESSAO por um texto longo e aleatório
npm run db:preparar         # cria o banco (SQLite) e carrega cursos, habilidades e vagas de exemplo
npm run vagas:atualizar     # (opcional) busca vagas reais nas fontes; veja a seção "Vagas reais"
npm run dev                 # http://localhost:3000
```

Outros comandos: `npm test` (testes), `npm run lint`, `npm run build`.

## O que tem

| Página | Função |
| --- | --- |
| `/` | Apresentação |
| `/vagas` | Lista com filtros (tipo, modalidade, área, **estado e cidade**), % de compatibilidade (quando logado e com perfil) e paginação |
| `/vagas/[id]` | Requisitos (✔ tem / ✘ falta) e cursos para cada lacuna. **Passe o mouse (ou toque) no nome de uma habilidade** para ver até 3 cursos gratuitos dela num mini quadro, sem sair da página |
| `/cursos` | Catálogo com busca por texto e filtros (habilidade, preço, nível em que começa, **até onde leva**, idioma, duração, certificado), ordenação e paginação |
| `/perfil` | Envio do currículo em PDF, revisão e edição das habilidades |
| `/entrar`, `/cadastrar` | Conta de estudante (e-mail e senha) |

## Vagas reais

Sem nenhuma fonte configurada, o site mostra 30 vagas **fictícias** de exemplo. Rodando `npm run vagas:atualizar`,
ele busca vagas reais, guarda no banco e **esconde as de exemplo** assim que houver ao menos uma vaga real.

| Fonte | Precisa de chave? | O que traz |
| --- | --- | --- |
| **Gupy** | Não | A maior plataforma de recrutamento do Brasil, com muito estágio e trainee. **Não é API oficial**: usa o mesmo endereço da busca do site `portal.gupy.io` (o `robots.txt` permite). Traz a descrição completa da vaga, então a leitura de requisitos é bem melhor. Em outubro/2026: 282 recebidas, 128 aproveitadas |
| **Adzuna** | Sim (gratuita) | Vagas do Brasil de vários sites. É a fonte principal; testada com dados reais (227 vagas recebidas, 178 aproveitadas numa execução) |
| **Jooble** | Sim (gratuita) | Funciona (testado com chave real), mas o índice do Brasil é pequeno e quase só traz vagas sênior de bancos e indústrias: numa execução, 70 recebidas e nenhuma para iniciante de TI. É só um complemento |
| **Remotive** | Não | Vagas 100% remotas (em inglês) abertas a quem mora no Brasil. A API pública devolve poucas vagas (em outubro/2026: 9 por categoria, nenhuma para iniciantes), então é só um complemento |
| **Comunidades no GitHub** | Não (token opcional) | Vagas das comunidades brasileiras (`frontendbr/vagas`, `backend-br/vagas`, `qa-brasil/vagas`, `datascience-br/vagas`, `androiddevbr/vagas`) |

Detalhe do Jooble: o campo `location` da API precisa ser `"Brazil"` (em inglês). Com `"Brasil"` ela devolve zero vagas
(o código já usa o valor certo). O endereço padrão é `jooble.org`; para trocar, defina `JOOBLE_HOST` no `.env`.

Como conseguir as chaves (depois, cole no arquivo `.env`):

- **Adzuna:** crie uma conta em https://developer.adzuna.com e copie o *Application ID* e a *Application Key*
  para `ADZUNA_APP_ID` e `ADZUNA_APP_KEY`.
- **Jooble:** peça a chave em https://jooble.org/api/about e cole em `JOOBLE_API_KEY`.
- **GitHub (opcional):** sem token vale o limite padrão, que basta para uma atualização. Se quiser mais, crie um token
  em https://github.com/settings/tokens (sem marcar nenhuma permissão) e cole em `GITHUB_TOKEN`.

**Sobre a Gupy:** como o endereço é não oficial, ele pode mudar ou ser bloqueado sem aviso. Por isso o volume é pequeno
(cerca de 40 consultas por execução, com pausa entre elas), o programa se identifica como `techvagas` e cada vaga mostra a
fonte e leva de volta à página original. Se parar de funcionar, as outras fontes continuam. Ela ignora "banco de
talentos", vagas com prazo de inscrição vencido e vagas sem prazo com mais de 6 meses.

Quando a mesma vaga (mesmo cargo na mesma empresa) vem de duas fontes, fica só a da fonte que aparece primeiro na lista
(`src/lib/vagas/fontes/index.ts`: Gupy, Adzuna, Jooble, Remotive, GitHub).

O que o comando faz com cada vaga:

- guarda **só estágio, trainee e júnior** (descarta pleno, sênior, líder etc.);
- descobre as habilidades pedidas lendo o texto do anúncio; o que vem depois de "diferenciais/desejável" vira
  requisito *desejável*;
- deduz habilidades básicas pelo cargo (ex.: "Front-end" implica HTML/CSS e JavaScript; "Analista de Dados" implica análise de dados);
- mantém vagas que claramente são de TI mesmo sem tecnologias no texto (ex.: "Estágio em Tecnologia da Informação"), mas **sem
  requisitos**: o site não calcula compatibilidade nem indica cursos para elas, e avisa isso na tela;
- descarta vagas que não são de TI (ex.: "Estágio para Direito", "Desenvolvedor de Negócios"). Se o cargo não indica
  tecnologia, o texto precisa pedir pelo menos duas habilidades técnicas fortes (inglês, suporte, metodologias ágeis e
  análise de dados sozinhos não bastam);
- atualiza as que já existem e **remove as que saíram do ar** (nunca mexe nas vagas de outras fontes);
- só aceita links `http`/`https` e mostra sempre a fonte e o botão para a vaga original.

Rode o comando de vez em quando (por exemplo, uma vez por dia). A Remotive pede que não se abuse das consultas.
Uma fonte que falhar ou estiver sem chave não impede as outras: o resumo no fim mostra o que aconteceu com cada uma.

Para incluir outra fonte, crie um arquivo em `src/lib/vagas/fontes/` que cumpra a interface `FonteExterna`
(`src/lib/vagas/tipos.ts`) e acrescente-o em `src/lib/vagas/fontes/index.ts`.

## Como funciona

- **Currículo**: `POST /api/curriculo` lê o texto do PDF (`unpdf`) e procura habilidades do catálogo
  (`src/lib/dados/habilidades.ts`, com sinônimos). O arquivo **não é gravado**; só ficam as habilidades que a pessoa confirma.
- **Compatibilidade** (`src/lib/compatibilidade.ts`): requisito obrigatório pesa 3, desejável pesa 1; nível abaixo do
  pedido vale meio ponto.
- **Cursos**: para cada lacuna, o melhor gratuito e o melhor pago. A ordem considera, nesta ordem de peso: o curso ser
  dedicado à habilidade, o nível do estudante, o certificado e quantas outras lacunas ele cobre. Cursos que resolvem
  várias lacunas de uma vez aparecem num bloco de atalho.
- **Filtro de estado e cidade** (`src/lib/localizacao.ts`): cada fonte escreve o local de um jeito ("Curitiba, Paraná",
  "São Paulo, Estado de São Paulo", "Renascença, Belo Horizonte"). `interpretarLocal` entende esses formatos e guarda
  cidade, sigla do estado e a cidade sem acentos; a busca por cidade ignora acentos e maiúsculas. Ao filtrar por um
  lugar, as vagas de lá vêm primeiro e as **remotas** continuam aparecendo depois (dá para esconder). Vagas "Brasil" ou
  sem local claro não entram no filtro de cidade/estado. Se o perfil tem cidade, aparece o botão "usar minha cidade".
- **Idioma dos cursos** (`src/lib/filtrar-cursos.ts`): é uma **estimativa** feita por sinais (endereço `/pt-br/`,
  menção a português, título em português, instituição brasileira). Confira no site do curso.
- **Mini quadro de cursos** (`src/components/RequisitoComCursos.tsx`): abre ao passar o mouse, tocar ou focar com o
  teclado; fecha com Esc ou clicando fora; os links abrem em outra aba. Os cursos vêm de `melhoresGratuitos`
  (`src/lib/compatibilidade.ts`): só gratuitos, de instituições diferentes, preferindo os que chegam ao nível pedido.
- **Catálogo** (`src/lib/dados/cursos*.ts`): um teste (`tests/catalogo.test.ts`) garante que toda habilidade tem pelo
  menos 3 cursos gratuitos, 2 gratuitos até o intermediário, 1 curso avançado e 1 pago até o intermediário. Se você
  adicionar uma habilidade nova, o teste avisa o que falta.
- **Fonte de vagas** (`src/lib/fonte-de-vagas.ts`): interface `FonteDeVagas` que as páginas usam; lê o banco.

## Atenção antes de publicar

- As **vagas de exemplo são fictícias** (`src/lib/dados/vagas.ts`).
- Em `src/lib/dados/cursos.ts`, `cursos-extra.ts` e `cursos-mais.ts` (277 cursos, 27 habilidades), **gratuidade, preço, carga horária e
  certificado precisam ser conferidos** no site de cada instituição. Vários links apontam para a página geral do
  provedor porque o endereço de cada curso muda.
- Os requisitos das vagas reais são **estimados automaticamente** pelo texto do anúncio, e o site avisa isso na tela.
- Em produção, defina `SEGREDO_SESSAO` e troque o SQLite por Postgres (`prisma/schema.prisma`).
- Ainda não há recuperação de senha, limite de tentativas de login nem confirmação de e-mail.
