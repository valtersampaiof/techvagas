# Como colocar o TechVagas no ar (de graça), passo a passo

Este guia leva o site do seu computador para a internet, **sem pagar nada e sem cartão de crédito** (confira na hora do
cadastro, pois os serviços podem mudar as regras). Você não precisa escrever código: só criar três contas e copiar alguns textos.

> **Aviso importante:** o ambiente em que o site foi construído não consegue abrir os sites da Vercel e do Turso. Por isso
> estes passos foram escritos com base no que esses serviços costumam mostrar, e **os nomes dos botões podem estar um pouco
> diferentes** quando você chegar lá. O raciocínio é o mesmo: se algum nome mudou, procure o parecido.

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

1. Entre em **turso.tech** e crie uma conta (pode ser com o seu GitHub).
2. Crie um banco de dados novo. Nome sugerido: `techvagas`.
   - Se o Turso perguntar a **região**, escolha a mais perto do Brasil que aparecer.
3. Abra o banco que você criou e procure:
   - o **endereço do banco** (começa com `libsql://`). Copie e guarde: é o **`TURSO_DATABASE_URL`**;
   - um botão para **criar um token** (uma "chave de acesso"). Crie e copie: é o **`TURSO_AUTH_TOKEN`**. Ele só aparece uma vez.

Guarde esses dois textos num bloco de notas por enquanto. **Nunca os coloque em lugar público**: quem tiver o token mexe no seu banco.

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

## Limites do plano gratuito

Os serviços gratuitos têm limites de uso (visitas, leituras do banco, minutos de execução) que mudam com o tempo. Para um
projeto de portfólio costumam sobrar, mas **confira as regras atuais** nas páginas de preços da Vercel, do Turso e do GitHub.
A Vercel gratuita, em especial, é para uso **não comercial**.
