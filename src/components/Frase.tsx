"use client";

import { useEffect, useRef } from "react";
import { COPY, LINKS } from "@/lib/conteudo";
import { limita } from "@/lib/movimento";
import { naRolagem } from "@/lib/rolagem";
import { Icone } from "./Marca";

// A frase acende palavra por palavra com a rolagem; a primeira parte acende na tinta, a segunda no tom claro.
export function Frase() {
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const acaoRef = useRef<HTMLDivElement>(null);
  const [forte, suave] = COPY.frase.titulo;

  useEffect(() => {
    const titulo = tituloRef.current;
    if (!titulo) return;
    const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const palavras = [...titulo.querySelectorAll<HTMLElement>(".palavra")];
    // o "Agendar" do topo fica em contorno enquanto o botão da frase não passou
    const botao = acaoRef.current?.querySelector(".botao");
    let olho: IntersectionObserver | undefined;
    if (botao) {
      olho = new IntersectionObserver(([e]) =>
        document.documentElement.classList.toggle("cta-antes", e.isIntersecting || e.boundingClientRect.top > 0),
      );
      olho.observe(botao);
    }
    const fim = calmo
      ? () => {}
      : naRolagem(() => {
          const r = titulo.getBoundingClientRect();
          const q = limita((innerHeight * 0.95 - r.top) / (innerHeight * 0.32));
          palavras.forEach((s, i) => s.style.setProperty("--luz", limita(q * palavras.length - i).toFixed(3)));
        });
    return () => {
      fim();
      olho?.disconnect();
    };
  }, []);

  // o espaço fica fora da palavra: dentro de um inline-block ele some no fim da linha
  const parte = (texto: string, classe: string) =>
    texto.split(" ").map((p, i) => (
      <span key={`${classe}${i}`}>
        <span className={`palavra palavra--${classe}`}>{p}</span>{" "}
      </span>
    ));

  return (
    <section className="frase" aria-labelledby="t-frase" data-sol="22 18 0.1">
      <div className="moldura">
        <h1 className="frase__titulo" id="t-frase" ref={tituloRef}>
          {parte(forte, "forte")}
          <br className="frase__quebra" />
          {parte(suave.replace("a família", "a família"), "suave")}
        </h1>
        <p className="frase__apoio">
          {COPY.frase.apoio[0]}
          <a href="#onde">{COPY.frase.apoio[1].replace("9/11", "9/11").replace("QI ", "QI ")}</a>
          {COPY.frase.apoio[2]}
        </p>
        <div className="frase__acao" ref={acaoRef}>
          <a className="botao botao--tinta" href={LINKS.agendar} target="_blank" rel="noopener">
            <Icone nome="i-whatsapp" />
            {COPY.frase.cta}
          </a>
          <p className="frase__nota">{COPY.frase.nota}</p>
        </div>
      </div>
    </section>
  );
}
