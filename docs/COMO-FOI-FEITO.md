# Como o TechVagas foi feito (explicado para quem não é da área)

Este documento conta, passo a passo e sem enrolação técnica, **o que é o site, de que ele é feito e como cada peça
funciona**. Quando aparecer uma palavra técnica, ela vem explicada na hora. No fim há um glossário.

> **Sobre quem fez:** o site foi construído por Valter com a ajuda da inteligência artificial Claude, que escreveu o código
> a partir das instruções e decisões dele. Isso é normal hoje em dia. O importante é entender o que foi feito, e é para isso
> que este documento existe.

---

## 1. A ideia, em uma frase

Quem está começando em tecnologia costuma não saber **por que não passa nas vagas** nem **o que estudar** para passar.
O TechVagas junta as vagas de TI do Brasil em um lugar só e mostra, para cada uma, **o que falta no seu currículo e quais
cursos (gratuitos e pagos) ensinam aquilo**.

Exemplo: uma vaga pede "Segurança da Informação" e você não tem. O site diz "você cobre 60% desta vaga; falta Segurança da
Informação" e sugere um curso gratuito para começar.

---

## 2. Uma comparação para entender o site: um restaurante

Todo site tem partes que fazem papéis parecidos com os de um restaurante:

| No restaurante | No site | No TechVagas |
| --- | --- | --- |
| **O salão** (o que o cliente vê) | A parte visual | As páginas de vagas, cursos, perfil, alertas |
| **A cozinha** (onde a comida é feita) | A parte que trabalha por trás | Os programas que leem o currículo, calculam a compatibilidade e filtram as vagas |
| **A despensa** (onde ficam os ingredientes) | O banco de dados | Onde ficam guardadas as vagas, os cursos, as contas e os alertas |
| **Os fornecedores** | Fontes externas de informação | Gupy, Adzuna, Jooble e sites de empresas, de onde vêm as vagas |
| **O fiscal da vigilância** | Os testes automáticos | Programas que conferem se tudo continua funcionando |

Guarde essa comparação: ela volta várias vezes abaixo.

---

## 3. As tecnologias e para que cada uma serve

Uma "tecnologia" aqui é só uma **ferramenta pronta** que alguém criou e que a gente usa para não precisar construir tudo do
zero, como usar uma cozinha industrial em vez de fabricar o fogão.

### 3.1 TypeScript — a língua em que o código é escrito
Um computador só entende instruções muito precisas. **TypeScript** é a "língua" em que escrevemos essas instruções. Ele é uma
versão do **JavaScript** (a língua mais usada na internet) que **avisa quando você escreve algo errado antes mesmo de rodar**.
É como um corretor ortográfico que também confere se a frase faz sentido.

### 3.2 React — os "blocos de montar" da tela
Uma página como a lista de vagas tem peças que se repetem: o cartão da vaga, o botão de estrela, o campo de filtro. O
**React** permite criar cada peça **uma vez** e reutilizá-la. Se eu mudar o cartão, todos os cartões mudam juntos.
Exemplo: o cartão de vaga é um bloco só, usado centenas de vezes.

### 3.3 Next.js — a estrutura do site
O React faz as peças; o **Next.js** monta o site inteiro: decide que o endereço `/vagas` mostra a lista de vagas, que
`/cursos` mostra os cursos, que `/perfil` mostra o seu perfil. Ele também faz o trabalho pesado nos bastidores (a "cozinha")
antes de entregar a página pronta para o seu navegador. Por isso o site abre rápido mesmo com milhares de vagas.

### 3.4 Tailwind CSS — a aparência
É a ferramenta que define cores, tamanhos, espaços e o jeito de se adaptar ao **celular**. Em vez de escrever um arquivo
enorme de estilos, cada elemento recebe etiquetas curtas como "bordas arredondadas" ou "texto pequeno e cinza".

### 3.5 SQLite e Prisma — a despensa e o ajudante que a organiza
- **Banco de dados** é um arquivo organizado em tabelas, como planilhas de Excel conectadas. O TechVagas usa o **SQLite**,
  que guarda tudo em **um único arquivo** no computador (`prisma/dev.db`). É simples e perfeito para um projeto pessoal.
- **Prisma** é o ajudante que conversa com esse banco. Em vez de escrever comandos difíceis, eu peço "me dê as vagas de nível
  pleno" e o Prisma traduz. Ele também guarda o **desenho das tabelas** em um arquivo (`prisma/schema.prisma`).

As principais "planilhas" (tabelas) do banco:

| Tabela | O que guarda |
| --- | --- |
| **Vaga** | título, empresa, cidade, nível, regime (CLT/PJ/estágio), salário, texto, link original |
| **Habilidade** | cada coisa que se pode saber: Python, SQL, Redes, Segurança... (46 no total) |
| **RequisitoDaVaga** | liga uma vaga a uma habilidade: "esta vaga pede SQL, nível básico" |
| **Curso** | os 419 cursos, com preço, carga horária, se tem certificado |
| **HabilidadeDoCurso** | liga um curso a uma habilidade: "este curso ensina Docker até o nível intermediário" |
| **Usuario** e suas habilidades | as contas e o que cada pessoa sabe |
| **VagaSalva** | as vagas marcadas com a estrela |
| **Alerta** | os avisos por e-mail que cada pessoa criou |

### 3.6 Zod — o porteiro dos formulários
Tudo que uma pessoa digita num formulário pode vir errado (ou até mal-intencionado). O **Zod** confere cada dado antes de
aceitar: "o e-mail parece um e-mail?", "o estado é um estado real?". Se não passa, o site responde com uma mensagem clara.

### 3.7 bcryptjs e jose — senha e "crachá" de login
- **bcryptjs** transforma a senha em um código embaralhado que **não dá para desfazer**. O site guarda só o código, nunca a
  senha de verdade. Quando você entra, ele embaralha o que você digitou e compara os dois códigos.
- **jose** cria o "crachá" digital (um pequeno arquivo no seu navegador) que prova que você já entrou, sem pedir senha a cada
  página. O crachá é **assinado** com um segredo, então ninguém consegue falsificá-lo.

### 3.8 unpdf — o leitor de currículo em PDF
Extrai o texto de dentro de um PDF. Depois, o nosso programa procura nesse texto as habilidades conhecidas (veja a seção 6).
**O PDF não é guardado**: só as habilidades que você confirmar.

### 3.9 nodemailer — o carteiro dos alertas
Envia e-mails. É o que avisa "apareceram vagas novas com os filtros que você escolheu".

### 3.10 Vitest — os testes automáticos
São programas que **testam o programa**. Exemplo: um teste diz "uma vaga com título 'Estágio em QA' nunca pode aparecer como
CLT". Se alguém mudar algo e quebrar essa regra, o teste falha na hora. O projeto tem mais de 400 testes que rodam em cerca
de 30 segundos.

### 3.11 ESLint — o revisor de estilo
Confere se o código segue boas práticas e aponta descuidos, como uma variável criada e nunca usada.

### 3.12 Git e GitHub — o caderno de versões
- **Git** guarda o **histórico** de tudo que mudou, como o "controle de alterações" do Word, mas para o projeto inteiro. Cada
  alteração salva se chama **commit** e tem uma descrição.
- **GitHub** é o site onde esse histórico fica guardado na internet e pode ser mostrado a outras pessoas (por exemplo, a
  quem lê o seu currículo): https://github.com/valtersampaiof/vagas-ti

### 3.13 Node.js e npm — o motor e a loja de peças
**Node.js** permite rodar JavaScript fora do navegador (é o "motor" da cozinha). **npm** é a "loja de peças": baixa todas as
ferramentas acima com um comando (`npm install`).

---

## 4. A construção, passo a passo

O site não foi feito de uma vez. Foi crescendo em etapas, e cada uma foi testada antes da seguinte.

### Etapa 1 — Planejar
Antes de escrever código, definimos: quem vai usar (estudantes de TI), o que o site faz e quais páginas existem. Também
decidimos o que **não** fazer: por exemplo, não guardar o PDF do currículo, por ser dado pessoal.

### Etapa 2 — Montar o "dicionário" de habilidades e cursos
Criamos uma lista de **habilidades** (Python, SQL, Docker, Segurança da Informação...) e, para cada uma, os **sinônimos** com
que aparecem nos anúncios: "JS" e "JavaScript" são a mesma coisa; "k8s" é Kubernetes. Sem isso, o site não reconheceria que
uma vaga que diz "k8s" pede Kubernetes.

Depois montamos o **catálogo de cursos**: hoje são 419, de plataformas conhecidas (Alura, Curso em Vídeo, Fundação Bradesco,
Microsoft Learn, Coursera, freeCodeCamp e outras). Cada curso diz **quais habilidades ensina e até que nível**: iniciante,
intermediário ou avançado.

### Etapa 3 — Criar o banco de dados
Desenhamos as tabelas da seção 3.5 e escrevemos um programa (a "semente", `prisma/seed.ts`) que **enche o banco** com as
habilidades, os cursos e 30 vagas **fictícias** de exemplo. Assim o site já funciona mesmo sem internet.

### Etapa 4 — Construir as páginas
Uma a uma: página inicial, lista de vagas, página de cada vaga, cursos, entrar/cadastrar, perfil. Cada página busca os dados
no banco e os desenha na tela.

### Etapa 5 — Contas e login
Cadastro com e-mail e senha (senha embaralhada, seção 3.7). Depois de entrar, o site te reconhece em todas as páginas.

### Etapa 6 — Ler o currículo
Você envia o PDF → o site extrai o texto → procura as habilidades do dicionário → **mostra o que achou e pede para você
conferir e corrigir** → só então salva. A leitura automática nunca é perfeita, por isso a pessoa sempre revisa.

### Etapa 7 — Calcular a compatibilidade
O coração do projeto (arquivo `src/lib/compatibilidade.ts`). Para cada vaga:
1. Olha os requisitos da vaga (ex.: Python, SQL, Segurança).
2. Compara com o que você tem. Requisitos **obrigatórios** pesam mais que os **desejáveis**.
3. Calcula a porcentagem e lista o que falta.
4. Para cada lacuna, escolhe cursos: prefere os que ensinam **justamente aquela habilidade no nível pedido**, os com
   certificado e os que cobrem **mais de uma lacuna ao mesmo tempo**. Mostra sempre uma opção gratuita e uma paga, quando existem.

### Etapa 8 — Trazer vagas reais
As 30 vagas de exemplo eram só uma demonstração. Criamos **"conectores"**, um para cada fonte, que vão buscar vagas reais:

| Fonte | Observação |
| --- | --- |
| **Gupy** | A maior plataforma de recrutamento do Brasil |
| **Adzuna** e **Jooble** | Agregadores de vagas (precisam de uma chave de acesso gratuita) |
| **Sites de empresas** | Páginas de carreira de dezenas de empresas, por meio das plataformas Greenhouse, Lever e Ashby |
| **Remotive** | Vagas 100% remotas |
| **Comunidades no GitHub** | Vagas publicadas por comunidades brasileiras de programação |

Cada conector fala "a língua" da sua fonte e entrega as vagas num **formato único**. Esse é o truque para ter várias fontes sem
bagunça: a "alfândega" (próxima etapa) só precisa entender um formato.

### Etapa 9 — A "alfândega": limpar e classificar cada vaga
Toda vaga que chega passa por uma triagem (`src/lib/vagas/normalizar.ts`). Ela:
- **Descobre o nível** (estágio, trainee, júnior, pleno, sênior, liderança) pelo título. "Dev Pleno/Sênior" fica como pleno,
  mas também aparece quando alguém filtra por sênior.
- **Descobre o regime** (CLT, PJ, estágio) e **a modalidade** (presencial, híbrido, remoto).
- **Lê o salário**, quando o anúncio informa.
- **Entende o local**: "São Paulo, Brazil" vira cidade São Paulo, estado SP.
- **Acha os requisitos** procurando as habilidades do dicionário dentro do texto.
- **Descarta o que não serve**: vaga de "banco de talentos" (só cadastro de currículo) e vagas que não são de TI, como "Comprador
  de TI", que é uma vaga de compras.

### Etapa 10 — Todos os níveis e todos os regimes
No começo o site era só para estágio e júnior. Ampliamos para **todos os níveis, em CLT, PJ e estágio**, e subimos o catálogo
de cursos de 400 para 419, cobrindo também habilidades de quem é pleno e sênior (Kubernetes, arquitetura de software,
liderança...). A versão antiga ficou guardada numa "ramificação" do Git chamada `versao-estagio-junior`.

### Etapa 11 — Organizar o texto da vaga
Muitos anúncios chegam como **um bloco de texto sem pausas**. Criamos um organizador (`src/lib/vagas/organizar.ts`) que divide
em seções (Sobre a vaga, Requisitos, Diferenciais, Benefícios) e monta um quadro **"Requisitos da vaga"** com escolaridade,
experiência e idiomas, lidos do texto. Quando o anúncio não diz, o site escreve "O anúncio não informa", em vez de inventar.

### Etapa 12 — Salvar vagas e alertas por e-mail
- A **estrela** salva a vaga na sua lista. Se a vaga sai do ar, ela continua na sua lista, marcada como "possivelmente encerrada".
- O **alerta** guarda os seus filtros (estado, regime, nível, área, salário...). Quando o site acha vagas **novas** que combinam,
  o carteiro (seção 3.9) manda um e-mail. O envio é feito por um comando que você roda depois de atualizar as vagas; o site
  não manda e-mails sozinho.

### Etapa 13 — Conferir se os filtros fazem o que dizem
Você percebeu que o filtro "inglês técnico" trazia cursos que **não ensinavam inglês**, só estavam escritos em inglês. Fomos
atrás da causa e de problemas parecidos. Veja a seção 7.

### Etapa 14 — Regime em primeiro lugar
CLT, PJ e estágio têm leis diferentes, então o filtro de **regime** vem logo depois da busca e **o filtro de nível muda
conforme o regime**: estágio não tem nível, PJ não tem trainee.

### Etapa 15 — Testar e publicar o código
A cada mudança: rodamos os testes, o revisor de estilo e conferimos a tela num navegador de verdade (de computador e de celular).
Só então a alteração foi guardada (commit) e enviada ao GitHub.

---

## 5. O caminho de uma vaga: da internet até a sua tela

```
[Gupy, Adzuna, Jooble, sites de empresas...]      <- os fornecedores
              |
              v
   Comando: npm run vagas:atualizar
   (os "conectores" buscam as vagas)
              |
              v
   "Alfândega": limpa, classifica e descarta
   (nível, regime, local, salário, requisitos)
              |
              v
   Banco de dados (a despensa)
              |
              v
   Você abre /vagas e usa os filtros
   (o site pergunta ao banco e desenha a lista)
              |
              v
   Abre uma vaga: vê os requisitos, o que falta
   e os cursos para cada lacuna
```

Importante: o site **não busca vagas em tempo real** quando você abre a página. As vagas são buscadas pelo comando de
atualização e guardadas no banco. Por isso a página abre rápido, e as vagas mostradas são as da última atualização.

---

## 6. Como o site "lê" um texto para achar habilidades

O site não "entende" o texto como uma pessoa. Ele faz algo mais simples e confiável:

1. **Limpa o texto:** tudo em letras minúsculas, sem acentos. "Segurança" vira "seguranca".
2. **Procura palavras do dicionário** (a lista de habilidades e sinônimos da Etapa 2) dentro do texto.
3. **Confere os limites da palavra.** "java" só vale se for a palavra inteira: não pode ser achada dentro de "javascript".
   Foi por isso que a busca foi corrigida (seção 7).

Isso vale tanto para o seu currículo quanto para os anúncios. Por ser uma estimativa automática, o site sempre avisa que os
requisitos devem ser conferidos na vaga original.

---

## 7. Os erros que apareceram e como foram corrigidos

Contar os erros é importante: eles mostram como se constrói software de verdade.

| O que você viu | Por que acontecia | Como foi corrigido |
| --- | --- | --- |
| "Inglês técnico" trazia cursos de Kubernetes, Git... | Uns 270 cursos tinham a etiqueta "inglês" só por serem **dados em inglês**, e o filtro achava que eles **ensinavam** inglês | A etiqueta ficou só nos 12 cursos que ensinam inglês. O idioma em que o curso é dado tem filtro próprio |
| Buscar "java" trazia "javascript" | A busca procurava qualquer pedaço do texto | A busca passou a exigir a **palavra inteira** |
| Buscar "certificado" trazia cursos "sem certificado" | A frase "sem certificado" também contava como acerto | Frases repetitivas como "Em inglês" e "sem certificado" são ignoradas na busca |
| Filtrar por Redes trazia um curso de Linux | O curso citava redes só de passagem | O filtro de habilidade só traz cursos que **ensinam de verdade** aquela habilidade |
| Vaga de estágio aparecendo em CLT | A Gupy marca vários estágios como "efetivo" | Estágio nunca é CLT nem PJ |
| Vaga "100% remoto" aparecendo como presencial | O título em inglês ("Remote") não era reconhecido | O título que diz "remoto" ou "remote" passou a valer |
| Vaga "Pleno/Sênior" só aparecia em Pleno | Cada vaga tinha um único nível | Vagas com mais de um nível aparecem em todos os filtros deles |
| "Tech Leader" sem nível | A palavra "leader" não estava na lista de liderança | Incluída |

Há uma lição aqui: **cada correção virou um teste automático**, para o mesmo erro não voltar sem alguém perceber.

---

## 8. O que o site ainda não faz bem (honestidade vale mais que enfeite)

- **Texto colado:** cerca de 12% das vagas (a maioria da Gupy) chegam com palavras coladas, como "APIs RESTIntegrações". A
  origem entrega o texto assim e uma correção automática poderia estragar nomes como "iFood".
- **Regime não informado:** quase metade das vagas não diz se é CLT ou PJ. Elas só aparecem em "Qualquer regime".
- **Dados dos cursos:** preço, carga horária e certificado mudam com o tempo e **precisam ser conferidos** no site de cada
  curso. O próprio site avisa isso.
- **Requisitos estimados:** são lidos automaticamente do texto, e podem errar.
- **Senha:** ainda não há "esqueci minha senha", limite de tentativas nem confirmação de e-mail. Antes de abrir ao público
  geral, isso precisaria ser feito.
- **Fonte não oficial:** a Gupy não oferece uma interface oficial para isso. O site usa o mesmo endereço do site deles, que
  pode mudar sem aviso. Se parar de funcionar, as outras fontes continuam.

---

## 9. Mapa das pastas (onde fica cada coisa)

| Pasta ou arquivo | O que tem |
| --- | --- |
| `src/app/` | As **páginas** (o salão): vagas, cursos, perfil, alertas, entrar... |
| `src/components/` | Os **blocos de montar** reutilizados: cartão de vaga, formulário de alerta, filtro de regime e nível |
| `src/lib/` | A **inteligência** (a cozinha): compatibilidade, filtros, busca, leitura de currículo |
| `src/lib/vagas/` | A "alfândega" e os conectores de cada fonte (`fontes/`) |
| `src/lib/dados/` | O dicionário de habilidades, o catálogo de cursos e as vagas de exemplo |
| `prisma/` | O desenho das tabelas, a "semente" e o arquivo do banco |
| `scripts/` | Os comandos: atualizar vagas e enviar alertas |
| `tests/` | Os mais de 400 testes automáticos |
| `docs/` | Este documento e as imagens do README |
| `README.md` | A "capa" do projeto no GitHub |

---

## 10. Como rodar o site no seu computador

Você precisa ter o **Node.js** instalado (nodejs.org). Depois, abra o terminal na pasta do projeto e rode, um de cada vez:

```
npm install              # baixa todas as ferramentas
cp .env.example .env     # cria o arquivo de configurações
npm run db:preparar      # cria o banco com cursos, habilidades e vagas de exemplo
npm run dev              # liga o site em http://localhost:3000
```

Para trazer vagas reais: `npm run vagas:atualizar`. Para rodar os testes: `npm test`.

O arquivo `.env` guarda **segredos** (chaves de acesso, segredo do login) e **nunca vai para o GitHub**. Por isso ninguém que
abra o projeto vê as suas chaves.

---

## 11. Glossário rápido

- **Banco de dados:** onde as informações ficam guardadas, organizadas em tabelas.
- **Commit:** uma alteração salva no histórico do Git, com uma descrição.
- **Conector:** programa que sabe buscar vagas em uma fonte específica.
- **Endereço de acesso (API):** um endereço da internet feito para programas conversarem entre si, não para pessoas.
- **Filtro:** uma regra que reduz a lista ("só vagas remotas").
- **Navegador:** Chrome, Edge, Safari... o programa onde você abre sites.
- **Repositório:** a pasta do projeto guardada no GitHub, com todo o histórico.
- **Sinônimos:** palavras diferentes que significam o mesmo ("JS" e "JavaScript").
- **Teste automático:** um programa que confere se outro programa faz o que deveria.
- **Terminal:** janela onde se digitam comandos para o computador.
- **Versão:** um momento do projeto guardado no histórico.
