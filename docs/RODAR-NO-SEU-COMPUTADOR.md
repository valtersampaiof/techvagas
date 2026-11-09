# Como rodar o TechVagas no seu computador (passo a passo)

Este guia mostra como abrir o site no **seu** computador, para ver, testar e mexer, sem publicar nada na internet.
Vale para **Windows** (o principal) e para Mac. Você não precisa saber programar: é só seguir os passos.

> **O que você vai ter no fim:** o site aberto no navegador, em `http://localhost:3000`, com as vagas e os cursos.
> "localhost" quer dizer "este computador": só você enxerga. Quando fechar o programa, o site some.

---

## Passo 1. Instalar o Node.js (uma vez só)

O Node.js é o programa que "liga" o site.

1. Abra **https://nodejs.org** e baixe a versão **LTS** (a recomendada). Precisa ser a **22 ou mais nova**.
2. Instale clicando em "Avançar" até o fim (as opções padrão servem).
3. Para conferir: abra o **Terminal** (veja o Passo 3) e digite `node -v`. Deve aparecer algo como `v22.x.x`.

## Passo 2. Preparar a pasta do projeto

Você tem duas opções:

**Opção A. Pelo arquivo `.zip` que recebeu**
1. Clique com o botão direito no arquivo `techvagas-projeto.zip` e escolha **Extrair tudo**.
2. Escolha um lugar fácil, como a área de trabalho. Vai nascer uma pasta chamada `techvagas`.
   Esse arquivo já traz as **vagas reais** buscadas até agora (você não precisa buscar de novo).

**Opção B. Pelo GitHub**
1. Instale o Git (https://git-scm.com).
2. No Terminal: `git clone https://github.com/valtersampaiof/techvagas` e depois `cd techvagas`.
   Nessa opção o site começa só com 30 vagas de exemplo; veja "Buscar vagas reais" no fim.

## Passo 3. Abrir o Terminal dentro da pasta

- **Windows:** abra a pasta `techvagas`, clique numa área vazia com o **botão direito** e escolha **"Abrir no Terminal"**
  (ou "Open in Terminal"). Se não aparecer, aperte `Shift` + botão direito e procure "Abrir janela do PowerShell aqui".
- **Mac:** abra o app **Terminal**, digite `cd ` (com um espaço), arraste a pasta `techvagas` para a janela e aperte Enter.

## Passo 4. Instalar as peças do projeto (uma vez só)

No Terminal, digite e aperte Enter:

```
npm install
```

Vai levar alguns minutos e mostrar muito texto: é normal. Termina quando o cursor volta a piscar.

## Passo 5. Criar o arquivo de configurações

No Terminal:

- **Windows:** `copy .env.example .env`
- **Mac:** `cp .env.example .env`

(Não precisa mudar nada dentro dele para rodar no seu computador.)

## Passo 6. Ligar o site

```
npm run dev
```

Quando aparecer "Ready" (pronto), abra o navegador em **http://localhost:3000**. Pronto, o site está no ar no seu computador.

Para **desligar**: volte ao Terminal e aperte `Ctrl` + `C`. Para ligar de novo outro dia, repita só o Passo 3 e o Passo 6.

---

## Se você veio pelo GitHub (Opção B): criar o banco de dados

Antes do Passo 6, rode uma vez:

```
npm run db:preparar
```

Isso cria o banco com os cursos, as habilidades e 30 vagas de exemplo.

## Buscar vagas reais (opcional)

```
npm run vagas:atualizar
```

Busca vagas na Gupy e nas páginas de carreira das empresas (leva alguns minutos). As fontes Adzuna e Jooble precisam de chaves
gratuitas, que você coloca no arquivo `.env` (veja os comentários dentro dele); sem elas, essas duas são puladas.

## Ver a versão final (a mesma que iria para a internet)

```
npm run build
npm run start
```

## Problemas comuns

| O que aparece | O que fazer |
| --- | --- |
| `'npm' não é reconhecido` | O Node.js não foi instalado, ou o Terminal foi aberto antes de instalar. Feche o Terminal e abra de novo |
| Erro dizendo que a versão do Node é antiga | Instale o Node.js 22 (Passo 1) |
| `Port 3000 is already in use` | Já há um site ligado. Feche o outro Terminal, ou use `npm run dev -- -p 3001` e abra `localhost:3001` |
| A página abre, mas sem vagas | Você está na Opção B: rode `npm run db:preparar` (e, se quiser, `npm run vagas:atualizar`) |
| O PowerShell bloqueia o comando | Use o "Prompt de Comando" (cmd) no lugar do PowerShell |

## O que **não** funciona no seu computador

- **E-mails** (confirmar e-mail, esqueci a senha, alertas) não são enviados, porque não há servidor de e-mail configurado. As contas
  novas já nascem com o e-mail confirmado.
- **Só você vê o site.** Para ter um endereço público, siga o guia "Como colocar o TechVagas no ar".
