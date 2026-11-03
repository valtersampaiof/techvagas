import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacidade" };

const Secao = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="mt-8">
    <h2 className="text-xl font-bold">{titulo}</h2>
    <div className="mt-2 space-y-3 leading-relaxed text-slate-700">{children}</div>
  </section>
);

export default function PaginaDePrivacidade() {
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="titulo-de-pagina">Política de privacidade</h1>
      <p className="mt-2 text-slate-600">
        O TechVagas é um projeto pessoal e gratuito. Aqui está, em linguagem simples, quais dados guardamos e o que fazemos com eles
        (em linha com a Lei Geral de Proteção de Dados, a LGPD).
      </p>

      <Secao titulo="Que dados guardamos">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Da sua conta:</strong> nome, e-mail e a sua senha, que fica embaralhada e não pode ser lida nem por nós.</li>
          <li><strong>Do seu perfil:</strong> as habilidades que você marca, o curso ou área de estudo e a cidade, se você preencher.</li>
          <li><strong>Da verificação em dois passos, se você a ligar:</strong> o segredo do aplicativo de códigos (guardado cifrado) e o resumo dos seus códigos de recuperação.</li>
          <li><strong>Do que você faz no site:</strong> vagas salvas, etapas de candidatura, cursos marcados como concluídos e alertas por e-mail.</li>
        </ul>
        <p>
          <strong>O seu currículo em PDF não é guardado.</strong> Ele é lido na hora, só para sugerir habilidades, e descartado.
        </p>
      </Secao>

      <Secao titulo="Para que usamos">
        <p>
          Só para o site funcionar: comparar o seu perfil com as vagas, sugerir cursos, guardar as suas vagas e enviar os alertas e
          os e-mails de confirmação e de senha. <strong>Não vendemos nem repassamos seus dados</strong> e não mostramos anúncios.
        </p>
      </Secao>

      <Secao titulo="Cookies">
        <p>Usamos um único cookie, o de sessão, que mantém você conectado. Não usamos cookies de publicidade nem de rastreamento.</p>
      </Secao>

      <Secao titulo="Onde os dados ficam">
        <p>
          Em um banco de dados na internet, em serviços de hospedagem. O e-mail é enviado por um serviço de e-mail. Esses
          serviços só processam os dados para o site funcionar.
        </p>
      </Secao>

      <Secao titulo="Seus direitos">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Corrigir:</strong> você edita o seu perfil a qualquer momento.</li>
          <li>
            <strong>Excluir:</strong> em <Link href="/perfil" className="font-semibold text-indigo-700 hover:underline">Meu perfil</Link>, no
            fim da página, há o botão “Excluir minha conta”. Tudo o que está ligado a você é apagado de uma vez.
          </li>
          <li>
            <strong>Outros pedidos</strong> (cópia dos seus dados, dúvidas): abra um pedido no{" "}
            <a href="https://github.com/valtersampaiof/techvagas/issues" className="font-semibold text-indigo-700 hover:underline" target="_blank" rel="noopener noreferrer">
              repositório do projeto
            </a>
            , sem colocar dados pessoais no texto.
          </li>
        </ul>
      </Secao>

      <Secao titulo="Sobre as vagas e os cursos">
        <p>
          As vagas vêm de fontes públicas e de páginas de carreira de empresas, e cada anúncio indica a origem e leva ao texto
          original. Os requisitos são estimados automaticamente. Preços e certificados de cursos mudam: confira no site de cada
          instituição.
        </p>
      </Secao>
    </article>
  );
}
