import { COPY, LINKS } from "@/lib/conteudo";
import { comOrdinal } from "@/lib/ordinal";
import { Icone } from "./Marca";
import { MarcaDesenhada } from "./MarcaDesenhada";
import { Titulo } from "./Titulo";

// O rodapé é um painel azul: o fechamento com o botão, o responsável técnico e os contatos.
export function Rodape() {
  const r = COPY.rodape;
  return (
    <footer className="rodape painel" data-escuro>
      <div className="moldura">
        <div className="rodape__fecho">
          <Titulo partes={r.titulo} className="titulo--claro" />
          <div className="rodape__acao">
            <a className="botao botao--claro" href={LINKS.agendar} target="_blank" rel="noopener">
              <Icone nome="i-whatsapp" />
              {r.cta}
            </a>
            <p className="rodape__nota">{r.nota}</p>
          </div>
        </div>
        <div className="rodape__grade">
          <MarcaDesenhada />
          <div className="rt">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/dr-flavio-160.webp" width={160} height={159} alt={r.rt.nome} loading="lazy" decoding="async" />
            <p>
              <strong>{r.rt.nome}</strong>
              <br />
              {r.rt.cargo}
              <span className="rt__sep"> · </span>
              <br className="rt__quebra" />
              {r.rt.funcao}
              <br />
              {r.rt.cro}
            </p>
          </div>
          <ul className="rodape__links">
            <li>
              <a href={LINKS.instagram} target="_blank" rel="noopener">
                {r.instagram}
              </a>
            </li>
            <li>
              <a href={LINKS.email}>{r.email}</a>
            </li>
            <li>
              <a href={LINKS.agendar} target="_blank" rel="noopener">
                WhatsApp {COPY.onde.whatsapp}
              </a>
            </li>
            <li>
              <a href={LINKS.telefone}>Telefone {COPY.onde.telefone}</a>
            </li>
          </ul>
        </div>
        <div className="rodape__base">
          <span>
            {r.base} ·{" "}
            <span className="pendente" data-pendente="inscrição da clínica no CRO-DF">
              {r.inscricao}
            </span>
          </span>
          <span>{comOrdinal(COPY.onde.endereco[0])} · Lago Sul, Brasília-DF</span>
        </div>
      </div>
    </footer>
  );
}
