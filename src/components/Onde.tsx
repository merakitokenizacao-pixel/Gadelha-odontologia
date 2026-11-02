import { COPY, LINKS } from "@/lib/conteudo";
import { comOrdinal } from "@/lib/ordinal";
import { Icone } from "./Marca";
import { Titulo } from "./Titulo";

// A entrada da clínica ao sol (a foto que estava na v3 e na v17). A borda da foto se desfaz no fundo da
// página, que tem o mesmo creme e areia da parede; atrás dela, um halo das próprias cores.
export function Onde() {
  const o = COPY.onde;
  return (
    <section className="onde" id="onde" aria-labelledby="t-onde" data-sol="16 52 0.8">
      <div className="moldura onde__grade">
        <div className="onde__texto">
          <p className="rotulo">{o.rotulo}</p>
          <Titulo partes={o.titulo} id="t-onde" />
          <address className="onde__endereco">
            {comOrdinal(o.endereco[0])}
            <br />
            {o.endereco[1]}
          </address>
          <ul className="onde__info">
            <li className="destaque">
              <span className="selo" aria-hidden="true">
                P
              </span>
              {o.estacionamento}
            </li>
            <li className="pendente" data-pendente="horário da clínica">
              <Icone nome="i-relogio" />
              {o.horario}
            </li>
            <li>
              <Icone nome="i-cartao" />
              {o.convenios}
            </li>
          </ul>
          <div className="onde__contato">
            <a href={LINKS.agendar} target="_blank" rel="noopener">
              <small>WhatsApp · horário comercial</small>
              {o.whatsapp}
            </a>
            <a href={LINKS.telefone}>
              <small>Telefone</small>
              {o.telefone}
            </a>
          </div>
          <div className="onde__mapas">
            <a className="botao botao--contorno" href={LINKS.maps} target="_blank" rel="noopener">
              Abrir no Google Maps
            </a>
            <a className="botao botao--contorno" href={LINKS.waze} target="_blank" rel="noopener">
              Abrir no Waze
            </a>
          </div>
        </div>
        <figure className="onde__foto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="onde__halo" src="/img/entrada-480.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="onde__img"
            src="/img/entrada-900.webp"
            srcSet="/img/entrada-480.webp 480w, /img/entrada-640.webp 640w, /img/entrada-900.webp 898w"
            sizes="(min-width: 900px) 449px, 100vw"
            width={898}
            height={1122}
            alt="A entrada da Gadelha Odontologia ao sol: a parede cor de areia com o nome em azul, a porta de vidro, um banco de madeira e vasos."
            loading="lazy"
            decoding="async"
          />
        </figure>
      </div>
    </section>
  );
}
