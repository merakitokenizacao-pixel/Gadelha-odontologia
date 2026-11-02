"use client";

import { useEffect, useRef } from "react";
import { COPY } from "@/lib/conteudo";
import { limita, suave } from "@/lib/movimento";
import { naMedida, naRolagem } from "@/lib/rolagem";

// A espiral da logo se desenha no meio da primeira tela. Ao rolar, ela sai do fluxo (position: fixed),
// encolhe até o lugar do símbolo do topo e o traço engrossa até o da marca; nos últimos 15% do voo o azul
// se desenha por cima do cáqui (misturar as duas cores passava por cinza). Quando pousa, some e o símbolo
// de verdade aparece. O nome do topo começa na margem e abre espaço pouco antes de ela chegar.
const ESPIRAL =
  "M18.19 16.14C23.15 15.70 22.71 16.90 22.71 19.01 22.71 23.23 23.44 24.85 16.95 24.82 10.46 24.78 7.71 19.80 7.78 15.43 7.87 10.58 11.14 7.63 18.02 7.52 34.20 7.26 34.16 30.79 16.79 30.79 7.97 30.79 1.30 24.20 1.30 15.88 1.31 7.56 7.02 1.30 17.18 1.44 27.34 1.58 33.43 10.11 29.34 22.83";

export function Abertura() {
  const lugarRef = useRef<HTMLDivElement>(null);
  const espiralRef = useRef<SVGSVGElement>(null);
  const orfaosRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raiz = document.documentElement;
    const lugar = lugarRef.current;
    const espiral = espiralRef.current;
    const simbolo = document.querySelector<SVGSVGElement>(".topo .marca__simbolo");
    const nomeTopo = document.querySelector<SVGSVGElement>(".topo .marca__nome");
    if (!lugar || !espiral || !simbolo || !nomeTopo) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const traco = espiral.querySelector<SVGPathElement>(".espiral__traco")!;
    const azul = espiral.querySelector<SVGPathElement>(".espiral__azul")!;
    const orfaos = orfaosRef.current ? [...orfaosRef.current.children] as HTMLElement[] : [];
    let a = { x: 0, y: 0, w: 1, h: 1 };
    let u0 = 0.11;
    let acelerou = false;

    const mede = () => {
      traco.style.strokeWidth = "";
      azul.style.strokeWidth = "";
      u0 = parseFloat(getComputedStyle(traco).strokeWidth) || 0.11;
      const r = lugar.getBoundingClientRect();
      a = { x: r.left, y: r.top + scrollY, w: r.width, h: r.height };
      raiz.classList.add("voa");
      espiral.style.width = `${a.w}px`;
      espiral.style.height = `${a.h}px`;
    };
    const acelera = () => {
      // se a pessoa já rolou, o desenho termina depressa em vez de seguir no ritmo da abertura
      acelerou = true;
      for (const an of traco.getAnimations()) an.playbackRate = 4;
      for (const el of orfaos) for (const an of el.getAnimations()) an.cancel();
    };
    const atualiza = () => {
      const b = simbolo.getBoundingClientRect();
      const p = limita(scrollY / (innerHeight * 0.55));
      const e = suave(limita(p / 0.85));
      const w = a.w + (b.width - a.w) * e;
      const x = a.x + (b.left - a.x) * e;
      const y = a.y + (b.top - a.y) * suave(p);
      espiral.style.transform = `translate(${x}px, ${y}px) scale(${w / a.w})`;
      const px0 = (u0 * a.w) / 35.5;
      const px1 = (2.02 * b.width) / 35.5;
      const largura = `${((px0 + (px1 - px0) * e) * 35.5) / w}`;
      traco.style.strokeWidth = largura;
      azul.style.strokeWidth = largura;
      azul.style.strokeDashoffset = (1 - limita((e - 0.85) / 0.15)).toFixed(4);
      const vao = (b.width + 12) * (1 - suave(limita((p - 0.45) / 0.35)));
      nomeTopo.style.transform = vao > 0.1 ? `translateX(${-vao}px)` : "";
      if (acelerou) {
        const f = (1 - limita(p / 0.2)).toFixed(3);
        for (const el of orfaos) el.style.opacity = f;
      }
      const pousou = p >= 1;
      raiz.classList.toggle("pousou", pousou);
      espiral.style.visibility = pousou ? "hidden" : "visible";
      simbolo.style.opacity = pousou ? "1" : "0";
      if (p > 0.01 && !acelerou) acelera();
    };

    mede();
    atualiza();
    const fimRolagem = naRolagem(atualiza);
    const fimMedida = naMedida(mede);
    document.fonts?.ready.then(() => {
      mede();
      atualiza();
    });
    return () => {
      fimRolagem();
      fimMedida();
      raiz.classList.remove("voa", "pousou");
      simbolo.style.opacity = "";
      nomeTopo.style.transform = "";
    };
  }, []);

  return (
    <section className="abertura" id="inicio" aria-label="Gadelha Odontologia, Lago Sul, Brasília" data-sol="12 6 0">
      <div className="abertura__lugar" ref={lugarRef}>
        <svg className="espiral espiral--grande abertura__espiral" viewBox="0 0 35.5 32.09" aria-hidden="true" ref={espiralRef}>
          <path className="espiral__traco" pathLength={1} d={ESPIRAL} />
          <path className="espiral__azul" pathLength={1} d={ESPIRAL} />
        </svg>
      </div>
      <div className="abertura__orfaos" ref={orfaosRef}>
        <p className="abertura__local">{COPY.abertura.local}</p>
        <span className="abertura__rolar" aria-hidden="true" />
      </div>
    </section>
  );
}
