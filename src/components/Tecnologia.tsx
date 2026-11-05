"use client";

import { useEffect, useRef, useState } from "react";
import { COPY } from "@/lib/conteudo";
import { limita, suave } from "@/lib/movimento";
import { naMedida, naRolagem } from "@/lib/rolagem";
import { ehToque, marcaPerto, pedeDesenho } from "@/lib/tres";
import { FILMES } from "@/tres/filme";
import { Cena } from "./Cena";
import { Titulo } from "./Titulo";

// O painel azul do planejamento digital. Ao chegar, uma linha de luz (a do escâner) desce pela página e
// deixa o azul para trás; na borda, a malha aparece um instante e assenta em azul liso. Os dois primeiros
// cartões são laços curtos em 3D (escaneamento e simulação); o terceiro é a foto da impressora da clínica,
// que chega perto devagar. Cada um acende quando a linha passa do pé dele (até lá, o pôster, dentro do
// recorte do painel), e os laços só tocam enquanto o cartão está à vista.
const LACO = { escaneamento: 6.5, simulacao: 6.5 } as const;
type Laco = keyof typeof LACO;
const ORDEM = ["escaneamento", "simulacao", "impressao"] as const;
const ehLaco = (id: string): id is Laco => id in LACO;

export function Tecnologia() {
  const ref = useRef<HTMLElement>(null);
  const luz = useRef<HTMLSpanElement>(null);
  const t = COPY.tecnologia;
  const [acesos, setAcesos] = useState([false, false, false]);

  useEffect(() => {
    const painel = ref.current;
    const linhaDeLuz = luz.current;
    if (!painel || !linhaDeLuz) return;
    const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const caixas = [...painel.querySelectorAll<HTMLElement>("[data-laco]")];
    if (calmo) {
      painel.style.setProperty("--linha", "1");
      setAcesos([true, true, true]);
      // sem 3D: os pôsteres; a régua da simulação no "planejado", com as três etapas marcadas
      const simulacao = caixas.find((c) => c.dataset.laco === "simulacao");
      simulacao?.style.setProperty("--p", "1");
      if (simulacao) simulacao.dataset.etapa = "4";
      return;
    }
    // a linha de luz: da borda de cima do painel até o pé da janela, enquanto o painel sobe
    let ultimo = "";
    const acesosAgora = ORDEM.map(() => false);
    const atualiza = () => {
      const r = painel.getBoundingClientRect();
      const e = suave(limita((innerHeight - r.top) / (innerHeight * 0.9)));
      const linhaY = r.top + (innerHeight - r.top) * e;
      const fim = e >= 0.999 || r.top < 0;
      const k = fim ? 1 : limita((linhaY - r.top) / r.height);
      painel.style.setProperty("--linha", k.toFixed(4));
      painel.classList.toggle("tecnologia--revelada", fim);
      // a linha de luz fica fora do recorte do painel (dentro dele, o próprio recorte a apagava)
      linhaDeLuz.style.transform = `translateY(${(k * r.height).toFixed(1)}px)`;
      linhaDeLuz.style.opacity = fim || k <= 0.001 ? "0" : "1";
      const novo = caixas.map((c) => fim || c.getBoundingClientRect().bottom < linhaY);
      novo.forEach((v, i) => (acesosAgora[i] = v));
      const chave = novo.join();
      if (chave !== ultimo) {
        ultimo = chave;
        setAcesos(novo);
      }
    };
    const fimRolagem = naRolagem(atualiza);
    const fimMedida = naMedida(atualiza);

    // os laços tocam só com o cartão aceso e à vista (o primeiro começa do início, quando a linha passa)
    const vivos = new Set<Laco>();
    let quadro = 0;
    let antes = performance.now();
    const laco = (agora: number) => {
      const dt = Math.min(0.1, (agora - antes) / 1000);
      antes = agora;
      let algum = false;
      vivos.forEach((id) => {
        if (!acesosAgora[ORDEM.indexOf(id)]) return;
        const f = FILMES[id];
        f.p = (f.p + dt / LACO[id]) % 1;
        algum = true;
      });
      if (algum) pedeDesenho();
      quadro = requestAnimationFrame(laco);
    };
    const olho = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          const id = (e.target as HTMLElement).dataset.laco ?? "";
          if (!ehLaco(id)) continue;
          if (e.isIntersecting) vivos.add(id);
          else vivos.delete(id);
        }
      },
      { threshold: 0.2 },
    );
    caixas.forEach((c) => olho.observe(c));
    quadro = requestAnimationFrame(laco);
    // no celular e no tablet, as telas 3D dos laços só existem com o painel perto da tela (olhando a caixa de
    // fora: o recorte do painel esconderia os cartões até a linha de luz passar)
    const idsLaco = Object.keys(LACO);
    const olhoPerto = new IntersectionObserver(([e]) => idsLaco.forEach((id) => marcaPerto(id, e.isIntersecting)), { rootMargin: "15% 0px" });
    if (ehToque() && painel.parentElement) olhoPerto.observe(painel.parentElement);
    return () => {
      fimRolagem();
      fimMedida();
      olho.disconnect();
      olhoPerto.disconnect();
      idsLaco.forEach((id) => marcaPerto(id, false));
      cancelAnimationFrame(quadro);
    };
  }, []);

  return (
    <div className="tecnologia-entrada">
      <span className="tecnologia__luz" ref={luz} aria-hidden="true" />
      <section className="tecnologia painel" id="tecnologia" aria-labelledby="t-tec" data-escuro ref={ref} data-sol="50 18 0.55">
        <div className="moldura">
          <p className="rotulo rotulo--claro">{t.rotulo}</p>
          <Titulo partes={t.titulo} id="t-tec" className="titulo--claro" />
          <ol className="tecnologia__lista">
            {ORDEM.map((id, i) => (
              <li className="tec" key={id}>
                <div className={`tec__arte ${id === "impressao" ? "tec__arte--foto" : ""} ${acesos[i] ? "tec__arte--acesa" : ""}`} data-laco={id}>
                  {id === "impressao" ? (
                    // a impressora da clínica, com os modelos impressos presos à plataforma
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className="tec__foto"
                      src="/img/impressora-900.webp"
                      srcSet="/img/impressora-480.webp 480w, /img/impressora-900.webp 900w"
                      sizes="(min-width: 900px) 30vw, 100vw"
                      width={900}
                      height={1124}
                      alt="A impressora 3D da clínica, com modelos de arcadas impressos presos à plataforma."
                      decoding="async"
                    />
                  ) : (
                    <Cena id={id} className="tec__3d" visivel={acesos[i]} calmo />
                  )}
                  {id === "simulacao" ? (
                    // as etapas do plano: o ponto para em cada número até o planejado
                    <div className="tec__regua" aria-hidden="true">
                      <span>hoje</span>
                      <i>
                        {[1, 2, 3].map((n) => (
                          <em key={n} style={{ left: `${n * 25}%` }}>
                            {n}
                          </em>
                        ))}
                        <b />
                      </i>
                      <span>planejado</span>
                    </div>
                  ) : null}
                </div>
                <p className="tec__n">{t.itens[i].n}</p>
                <p className="tec__texto">
                  <strong>{t.itens[i].forte}</strong> {t.itens[i].apoio}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
