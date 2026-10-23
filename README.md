# Rota TI

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
| `/vagas` | Lista com filtros e % de compatibilidade (quando logado e com perfil) |
| `/vagas/[id]` | Requisitos (✔ tem / ✘ falta) e cursos para cada lacuna |
| `/cursos` | Catálogo com filtros (gratuito/pago, certificado, nível, habilidade) |
| `/perfil` | Envio do currículo em PDF, revisão e edição das habilidades |
| `/entrar`, `/cadastrar` | Conta de estudante (e-mail e senha) |

## Vagas reais

Sem nenhuma fonte configurada, o site mostra 30 vagas **fictícias** de exemplo. Rodando `npm run vagas:atualizar`,
ele busca vagas reais, guarda no banco e **esconde as de exemplo** assim que houver ao menos uma vaga real.

| Fonte | Precisa de chave? | O que traz |
| --- | --- | --- |
| **Adzuna** | Sim (gratuita) | Vagas do Brasil de vários sites |
| **Jooble** | Sim (gratuita) | Vagas do Brasil de vários sites |
| **Remotive** | Não | Vagas 100% remotas (em inglês) abertas a quem mora no Brasil |
| **Comunidades no GitHub** | Não (token opcional) | Vagas das comunidades brasileiras (`frontendbr/vagas`, `backend-br/vagas`, `qa-brasil/vagas`, `datascience-br/vagas`, `androiddevbr/vagas`) |

Como conseguir as chaves (depois, cole no arquivo `.env`):

- **Adzuna:** crie uma conta em https://developer.adzuna.com e copie o *Application ID* e a *Application Key*
  para `ADZUNA_APP_ID` e `ADZUNA_APP_KEY`.
- **Jooble:** peça a chave em https://jooble.org/api/about e cole em `JOOBLE_API_KEY`.
- **GitHub (opcional):** sem token vale o limite padrão, que basta para uma atualização. Se quiser mais, crie um token
  em https://github.com/settings/tokens (sem marcar nenhuma permissão) e cole em `GITHUB_TOKEN`.

O que o comando faz com cada vaga:

- guarda **só estágio, trainee e júnior** (descarta pleno, sênior, líder etc.);
- descobre as habilidades pedidas lendo o texto do anúncio; o que vem depois de "diferenciais/desejável" vira
  requisito *desejável*;
- descarta a vaga se não reconhecer nenhuma habilidade (a compatibilidade não faria sentido);
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
- **Fonte de vagas** (`src/lib/fonte-de-vagas.ts`): interface `FonteDeVagas` que as páginas usam; lê o banco.

## Atenção antes de publicar

- As **vagas de exemplo são fictícias** (`src/lib/dados/vagas.ts`).
- Em `src/lib/dados/cursos.ts` e `cursos-extra.ts` (143 cursos, 27 habilidades), **gratuidade, preço, carga horária e
  certificado precisam ser conferidos** no site de cada instituição. Vários links apontam para a página geral do
  provedor porque o endereço de cada curso muda.
- Os requisitos das vagas reais são **estimados automaticamente** pelo texto do anúncio, e o site avisa isso na tela.
- Em produção, defina `SEGREDO_SESSAO` e troque o SQLite por Postgres (`prisma/schema.prisma`).
- Ainda não há recuperação de senha, limite de tentativas de login nem confirmação de e-mail.
