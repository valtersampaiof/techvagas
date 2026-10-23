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
npm run db:preparar         # cria o banco (SQLite) e carrega vagas, cursos e habilidades de exemplo
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

## Como funciona

- **Currículo**: `POST /api/curriculo` lê o texto do PDF (`unpdf`) e procura habilidades do catálogo
  (`src/lib/dados/habilidades.ts`, com sinônimos). O arquivo **não é gravado**; só ficam as habilidades que a pessoa confirma.
- **Compatibilidade** (`src/lib/compatibilidade.ts`): requisito obrigatório pesa 3, desejável pesa 1; nível abaixo do
  pedido vale meio ponto.
- **Cursos**: para cada lacuna, o melhor gratuito e o melhor pago, ordenados por adequação ao nível, foco do curso na
  habilidade, certificado e quantas outras lacunas ele cobre.
- **Fonte de vagas** (`src/lib/fonte-de-vagas.ts`): interface `FonteDeVagas`. Hoje lê o banco com vagas fictícias;
  para usar vagas reais, crie outra implementação (ex.: Adzuna ou Jooble) sem mexer nas páginas.

## Atenção antes de publicar

- As **30 vagas são fictícias** (`src/lib/dados/vagas.ts`).
- Em `src/lib/dados/cursos.ts`, **gratuidade, preço, carga horária e certificado precisam ser conferidos** no site de cada
  instituição; os links apontam para páginas gerais dos provedores.
- Em produção, defina `SEGREDO_SESSAO` e troque o SQLite por Postgres (`prisma/schema.prisma`).
- Ainda não há recuperação de senha, limite de tentativas de login nem confirmação de e-mail.
