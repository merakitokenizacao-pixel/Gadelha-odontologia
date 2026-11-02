"use client";

import { useEffect, useRef } from "react";
import { Nome } from "./Marca";

// A marca do rodapé: quando o painel azul chega, a espiral se desenha em creme (o inverso da abertura,
// que desenha em cáqui sobre o creme) e fica no lugar do símbolo, com o nome embaixo.
const ESPIRAL =
  "M18.19 16.14C23.15 15.70 22.71 16.90 22.71 19.01 22.71 23.23 23.44 24.85 16.95 24.82 10.46 24.78 7.71 19.80 7.78 15.43 7.87 10.58 11.14 7.63 18.02 7.52 34.20 7.26 34.16 30.79 16.79 30.79 7.97 30.79 1.30 24.20 1.30 15.88 1.31 7.56 7.02 1.30 17.18 1.44 27.34 1.58 33.43 10.11 29.34 22.83";

export function MarcaDesenhada() {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const olho = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("desenha");
          olho.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    olho.observe(el);
    return () => olho.disconnect();
  }, []);

  return (
    <a className="marca marca--rodape" href="#inicio" aria-label="Gadelha Odontologia, voltar ao início" ref={ref}>
      <svg className="espiral marca__espiral" viewBox="0 0 35.5 32.09" aria-hidden="true">
        <path pathLength={1} d={ESPIRAL} />
      </svg>
      <Nome />
    </a>
  );
}
