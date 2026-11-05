"use client";

import { useEffect, useRef } from "react";
import { estadoFundo } from "@/lib/fundo";
import { limita } from "@/lib/movimento";
import { naRolagem } from "@/lib/rolagem";

// A luz do fundo, em CSS (nada de WebGL na primeira tela): a mancha de sol quente e a sombra das palmeiras
// da galeria. A mancha anda com a rolagem e para quando a pessoa para; cada seção marca onde ela fica
// (data-sol="x y calor", em % da janela e de 0 a 1). Só a abertura tem brisa nas folhas.
// As duas manchas são quadros pequenos, pintados uma vez e esticados; andar é só mudar o transform e a
// opacidade. Antes, eram degradês com variáveis na raiz da página: a cada quadro da rolagem, o navegador
// recalculava o estilo da página inteira e repintava a janela.

// O degradê original: de 100% da cor até sumir em `fim` do raio.
function pinta(c: HTMLCanvasElement, rgb: string, fim: number) {
  const x = c.getContext("2d");
  if (!x) return false;
  const m = c.width / 2;
  const g = x.createRadialGradient(m, m, 0, m, m, m);
  g.addColorStop(0, `rgba(${rgb}, 1)`);
  g.addColorStop(fim, `rgba(${rgb}, 0)`);
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.height);
  return true;
}

// A caixa onde a mancha anda passa 10% da janela de cada lado; x e y são % dessa caixa.
const naCaixa = (pct: number, lado: number) => -0.1 * lado + (pct / 100) * 1.2 * lado;

export function Luz() {
  const caixa = useRef<HTMLDivElement>(null);
  const sol = useRef<HTMLCanvasElement>(null);
  const areia = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const raiz = document.documentElement;
    const ancoras = [...document.querySelectorAll<HTMLElement>("[data-sol]")].map((el) => {
      const [x, y, calor] = el.dataset.sol!.split(" ").map(Number);
      return { el, x, y, calor };
    });
    const solEl = sol.current;
    const areiaEl = areia.current;
    if (!ancoras.length || !solEl || !areiaEl || !caixa.current) return;
    if (!pinta(solEl, "255, 250, 240", 0.72) || !pinta(areiaEl, "214, 196, 160", 0.7)) return;
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
      const chave = `${x.toFixed(1)}|${y.toFixed(1)}|${calor.toFixed(2)}|${innerWidth}|${innerHeight}`;
      if (chave !== ultimo) {
        ultimo = chave;
        solEl.style.transform = `translate3d(${naCaixa(x, innerWidth).toFixed(1)}px, ${naCaixa(y, innerHeight).toFixed(1)}px, 0)`;
        solEl.style.opacity = (0.7 + 0.2 * calor).toFixed(3);
        areiaEl.style.transform = `translate3d(${naCaixa(x + 55, innerWidth).toFixed(1)}px, ${naCaixa(y + 70, innerHeight).toFixed(1)}px, 0)`;
        areiaEl.style.opacity = (0.14 + 0.16 * calor).toFixed(3);
      }
      raiz.classList.toggle("na-abertura", scrollY < innerHeight * 0.5);
    };
    const fim = naRolagem(atualiza);
    atualiza();
    caixa.current.classList.add("luz--viva");
    return fim;
  }, []);

  return (
    <div className="luz" aria-hidden="true" ref={caixa}>
      <canvas className="luz__mancha luz__mancha--areia" width={128} height={128} ref={areia} />
      <canvas className="luz__mancha luz__mancha--sol" width={128} height={128} ref={sol} />
      <div className="luz__folhas" />
    </div>
  );
}
