# Como colocar o TechVagas no ar (de graça), passo a passo

Este guia leva o site do seu computador para a internet, **sem pagar nada e sem cartão de crédito** (confira na hora do
cadastro, pois os serviços podem mudar as regras). Você não precisa escrever código: só criar três contas e copiar alguns textos.

> **O que foi conferido e o que não foi:** em 03/11/2026 conferi nas páginas oficiais do Turso e da Vercel os limites do plano
> gratuito e os comandos usados aqui. Também testei, no computador, o caminho completo que o site usa na internet (preparar o
> banco, carregar os cursos, buscar vagas, consultar, transações e o token de acesso) contra um servidor de teste que fala o mesmo
> protocolo do Turso. O que **não** foi possível testar é o seu banco real e a sua conta na Vercel, porque isso exige contas suas.
> Os **nomes dos botões** dos sites podem ser um pouco diferentes: se algum mudou, procure o parecido.

## Como as peças se encaixam

| Peça | Serviço gratuito | Para que serve |
| --- | --- | --- |
| **O site** (o que as pessoas abrem) | **Vercel** | Guarda e mostra o site |
| **O banco de dados** (vagas, cursos, contas) | **Turso** | Guarda as informações. É o mesmo tipo de banco que você usa no computador, só que fica na internet |
| **O atualizador** (busca vagas novas e manda os alertas) | **GitHub Actions** | Roda sozinho a cada 6 horas, no próprio GitHub |

Por que três peças? O site "dorme" quando ninguém usa e não guarda arquivos de um acesso para o outro, por isso as
informações ficam num banco à parte. E as vagas novas precisam ser buscadas de tempos em tempos, por alguém que fique
acordado: esse é o atualizador.

---

## Passo 1. Criar o banco de dados (Turso)

1. Entre em **turso.tech** e crie uma conta (pode ser com o seu GitHub). O plano gratuito não pede cartão de crédito.
2. Crie um banco de dados novo, com o nome `techvagas`.
   - **Atenção ao tipo:** o Turso hoje tem dois tipos de banco, o novo ("Turso") e o **libSQL**. O TechVagas usa o **libSQL**.
     Se aparecer uma escolha de tipo, escolha **libSQL**. Pelo comando `turso db create techvagas`, o padrão já é libSQL
     (o tipo novo só nasce com a opção `--tursodb`).
   - Se o Turso perguntar a **região**, escolha a mais perto do Brasil que aparecer.
3. Pegue duas informações do banco:
   - o **endereço** (começa com `libsql://`): é o **`TURSO_DATABASE_URL`**;
   - um **token** (chave de acesso): é o **`TURSO_AUTH_TOKEN`**. Ele só aparece uma vez, então copie na hora.

   No painel do site (turso.tech/app) ficam nas telas do banco. Se preferir o terminal, os comandos (conferidos na documentação
   do Turso) são `turso db show techvagas --url` para o endereço e `turso db tokens create techvagas` para o token.

Guarde esses dois textos num bloco de notas por enquanto. **Nunca os coloque em lugar público** (nem em conversas): quem tiver
o token mexe no seu banco.

## Passo 2. Dar os segredos ao GitHub (para o atualizador)

1. Abra o repositório no GitHub: **github.com/valtersampaiof/techvagas**.
2. Vá em **Settings → Secrets and variables → Actions → New repository secret**.
3. Crie um segredo para cada linha abaixo (o **nome** precisa ser igual; o **valor** é o que você copiou):

| Nome do segredo | Valor | Obrigatório? |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | endereço do banco (Passo 1) | **Sim** |
| `TURSO_AUTH_TOKEN` | token do banco (Passo 1) | **Sim** |
| `ADZUNA_APP_ID` e `ADZUNA_APP_KEY` | chaves gratuitas de developer.adzuna.com | Não (mais vagas) |
| `JOOBLE_API_KEY` | chave gratuita de jooble.org/api/about | Não |
| `SITE_URL` | o endereço do site, depois do Passo 4 (ex.: `https://techvagas.vercel.app`) | Para os links dos e-mails |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_DE` | dados de um serviço de e-mail (veja o Passo 5) | Só para e-mails |

As chaves da Adzuna e da Jooble que apareceram no chat durante a construção **devem ser trocadas por novas** antes de usar aqui.

## Passo 3. Rodar o atualizador pela primeira vez

1. No repositório, abra a aba **Actions**.
2. No menu da esquerda, clique em **Atualizar vagas**.
3. Clique em **Run workflow → Run workflow**.
4. Espere (de 10 a 30 minutos na primeira vez). Quando aparecer um ✔ verde, o banco está **criado e cheio**: tabelas, 419
   cursos e as vagas reais.
5. Se aparecer um ✘ vermelho, clique nele e leia a mensagem. O erro mais comum é um segredo escrito errado no Passo 2.

Depois disso ele roda **sozinho a cada 6 horas**. (O GitHub pausa o agendamento se o repositório ficar 60 dias sem nenhuma
alteração; basta clicar em "Enable workflow" na aba Actions.)

## Passo 4. Publicar o site (Vercel)

1. Entre em **vercel.com** e crie uma conta **com o seu GitHub**.
2. Clique em **Add New… → Project** e escolha o repositório **techvagas**.
3. Antes de clicar em **Deploy**, abra **Environment Variables** e crie:

| Nome | Valor |
| --- | --- |
| `TURSO_DATABASE_URL` | o mesmo do Passo 1 |
| `TURSO_AUTH_TOKEN` | o mesmo do Passo 1 |
| `SEGREDO_SESSAO` | um texto **longo e aleatório** (mais de 32 letras e números misturados). Ele protege o login |
| `SITE_URL` | o endereço que a Vercel vai dar (pode ser ajustado depois) |
| `DATABASE_URL` | `file:./dev.db` (só para o programa não reclamar na hora de montar o site) |

4. Clique em **Deploy** e espere alguns minutos. A Vercel mostra o endereço do site (algo como `techvagas.vercel.app`).
5. Volte aos segredos do GitHub (Passo 2) e coloque esse endereço em `SITE_URL`.

A partir daí, **toda vez que o código mudar no GitHub, a Vercel publica a versão nova sozinha**.

## Passo 5. E-mails (opcional, mas necessário para alertas, confirmação e "esqueci minha senha")

O site manda e-mails por **SMTP**, que quase todo serviço de e-mail oferece. Opções gratuitas: Brevo, Resend, ou o seu Gmail
com uma "senha de app". Você recebe 5 dados (servidor, porta, usuário, senha e remetente). Coloque-os:

- **na Vercel** (Environment Variables), para o site mandar "confirme seu e-mail" e "redefinir senha";
- **nos segredos do GitHub**, para o atualizador mandar os alertas.

Nomes: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `EMAIL_DE` (ex.: `TechVagas <avisos@seudominio.com>`).

Sem isso o site funciona normalmente. A diferença: as contas novas já nascem com o e-mail "confirmado", e os e-mails de
alerta e de senha não são enviados.

## Passo 6. Conferir

1. Abra o endereço do site. A página inicial deve mostrar milhares de vagas.
2. Crie uma conta de teste, envie um currículo e abra uma vaga.
3. Se tudo estiver certo, é só colocar o link no currículo.

## E se der errado?

| Sintoma | Causa mais provável |
| --- | --- |
| O atualizador (Actions) falha logo no começo | Segredo `TURSO_DATABASE_URL` ou `TURSO_AUTH_TOKEN` faltando ou com espaço sobrando |
| O site abre, mas sem vagas | O atualizador ainda não terminou o Passo 3 |
| O site dá erro ao abrir | Variáveis da Vercel erradas (confira o Passo 4) e olhe a aba **Logs** do projeto |
| O login não funciona | Falta `SEGREDO_SESSAO` na Vercel |
| As páginas demoram para abrir | O banco e a Vercel estão em regiões distantes. Na Vercel, em **Settings → Functions**, escolha a região mais perto do banco |

## Limites do plano gratuito (conferidos em 03/11/2026)

- **Turso (plano Free):** 100 bancos, 5 GB de espaço, 500 milhões de linhas lidas por mês e 10 milhões de linhas gravadas por mês,
  sem cartão de crédito.
- **Vercel (plano Hobby):** gratuito, mas **só para uso pessoal e não comercial**. Funções de até 5 minutos por chamada.
- **GitHub Actions:** gratuito em repositório público.

**Uma conta de padeiro para o banco:** cada abertura da lista de vagas lê, no total, cerca de 10 a 12 mil linhas do banco. Com
500 milhões por mês, isso dá algo como 40 mil listas abertas por mês, o suficiente para um portfólio. A atualização das vagas
grava algumas dezenas de milhares de linhas por vez; a cada 6 horas fica bem abaixo das 10 milhões por mês. Se um dia chegar perto
do limite, a saída mais simples é atualizar a cada 12 horas (arquivo `.github/workflows/atualizar-vagas.yml`).

Esses números mudam com o tempo: confira as páginas de preços antes de contar com eles. Na página de preços do Turso há um aviso de que
a empresa está se juntando à Supabase; vale acompanhar se algo mudar no plano gratuito.
