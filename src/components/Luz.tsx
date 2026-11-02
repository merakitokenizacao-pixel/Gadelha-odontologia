"use client";

import { useEffect } from "react";
import { estadoFundo } from "@/lib/fundo";
import { limita } from "@/lib/movimento";
import { naRolagem } from "@/lib/rolagem";

// A luz do fundo, em CSS (nada de WebGL na primeira tela): a mancha de sol quente e a sombra das palmeiras
// da galeria. A mancha anda com a rolagem e para quando a pessoa para; cada seção marca onde ela fica
// (data-sol="x y calor", em % da janela e de 0 a 1). Só a abertura tem brisa nas folhas.
export function Luz() {
  useEffect(() => {
    const raiz = document.documentElement;
    const ancoras = [...document.querySelectorAll<HTMLElement>("[data-sol]")].map((el) => {
      const [x, y, calor] = el.dataset.sol!.split(" ").map(Number);
      return { el, x, y, calor };
    });
    if (!ancoras.length) return;
    let ultimo = "";
    const atualiza = () => {
      const meio = innerHeight * 0.5;
      // centro de cada âncora na tela; acha o par em volta do meio da janela e mistura
      const centros = ancoras.map((a) => {
        const r = a.el.getBoundingClientRect();
        return r.top + Math.min(r.height, innerHeight) * 0.5;
      });
      let i = 0;
      while (i < ancoras.length - 1 && centros[i + 1] < meio) i++;
      const a = ancoras[i];
      const b = ancoras[Math.min(i + 1, ancoras.length - 1)];
      const t = b === a ? 0 : limita((meio - centros[i]) / Math.max(1, centros[i + 1] - centros[i]));
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const calor = Math.max(a.calor + (b.calor - a.calor) * t, estadoFundo.calor);
      const chave = `${x.toFixed(1)}|${y.toFixed(1)}|${calor.toFixed(2)}`;
      if (chave !== ultimo) {
        ultimo = chave;
        raiz.style.setProperty("--sol-x", `${x.toFixed(1)}%`);
        raiz.style.setProperty("--sol-y", `${y.toFixed(1)}%`);
        raiz.style.setProperty("--calor", calor.toFixed(2));
      }
      raiz.classList.toggle("na-abertura", scrollY < innerHeight * 0.5);
    };
    return naRolagem(atualiza);
  }, []);

  return (
    <div className="luz" aria-hidden="true">
      <div className="luz__sol" />
      <div className="luz__folhas" />
    </div>
  );
}
