"use client";

import { useEffect, useRef } from "react";
import { COPY } from "@/lib/conteudo";
import { limita, suave } from "@/lib/movimento";
import { alturaTopo, naMedida, naRolagem } from "@/lib/rolagem";
import { Titulo } from "./Titulo";

// "Pode entrar": o palco fica parado e a rolagem anda da porta à recepção e ao consultório. A foto
// seguinte nasce de uma abertura de verdade da foto da vez e cresce até a janela: a recepção aparece
// pelo vidro da porta; o consultório, pela porta de vidro do fundo da recepção. A foto da vez se
// aproxima no máximo 8% (são fotos de celular). A legenda de cada parada fica na página, ao lado.

// abertura de cada foto por onde a próxima aparece (frações x0, y0, x1, y1 do recorte)
const ABERTURAS: [number, number, number, number][] = [
  [0.0, 0.34, 0.54, 1.0], // o vidro da porta de entrada (a foto mostra a folha da direita e o nome)
  [0.36, 0.05, 0.53, 0.42], // a porta de vidro no fundo da recepção
];

const FOTOS = [
  { arquivo: "porta", maior: 880, w: 883, h: 1104, alt: "A porta de vidro da clínica, com o nome Gadelha Odontologia na parede ao lado." },
  { arquivo: "recepcao", maior: 860, w: 840, h: 1037, alt: "A recepção: balcão branco, cadeiras de espera e piso de madeira." },
  { arquivo: "consultorio", maior: 1200, w: 992, h: 1240, alt: "O consultório, com a cadeira odontológica e a janela com persiana." },
];

const TRECHOS = [
  [0, 0.34],
  [0.46, 0.66],
  [0.78, 1],
];
const PASSAGENS = [
  [0.3, 0.46],
  [0.64, 0.8],
];

export function Clinica() {
  const ref = useRef<HTMLElement>(null);
  const c = COPY.clinica;

  useEffect(() => {
    const raiz = ref.current;
    if (!raiz) return;
    const passeio = raiz.querySelector<HTMLElement>(".passeio")!;
    const palco = raiz.querySelector<HTMLElement>(".passeio__palco")!;
    const fotos = [...raiz.querySelectorAll<HTMLElement>(".passeio__foto")];
    const imgs = fotos.map((f) => f.querySelector("img")!);
    const halos = [...raiz.querySelectorAll<HTMLElement>(".passeio__halo")];
    const paradas = [...raiz.querySelectorAll<HTMLElement>(".passeio__paradas li")];
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    passeio.classList.add("passeio--ativo");

    const mede = () => {
      passeio.style.height = `calc(100svh - var(--topo) + ${Math.round(innerHeight * 1.7)}px)`;
    };
    const recorte = (a: [number, number, number, number], k: number) => {
      // da abertura (k = 0) à janela inteira (k = 1)
      const [x0, y0, x1, y1] = a.map((v) => v * 100);
      const t = y0 * (1 - k);
      const r = (100 - x1) * (1 - k);
      const b = (100 - y1) * (1 - k);
      const l = x0 * (1 - k);
      return `inset(${t.toFixed(2)}% ${r.toFixed(2)}% ${b.toFixed(2)}% ${l.toFixed(2)}% round ${(6 + 22 * k).toFixed(1)}px)`;
    };
    const centro = (a: number[]) => `${(((a[0] + a[2]) / 2) * 100).toFixed(1)}% ${(((a[1] + a[3]) / 2) * 100).toFixed(1)}%`;
    imgs[0].style.transformOrigin = centro(ABERTURAS[0]);
    imgs[1].style.transformOrigin = centro(ABERTURAS[1]);
    const atualiza = () => {
      const r = passeio.getBoundingClientRect();
      const D = passeio.offsetHeight - palco.offsetHeight;
      if (D <= 0 || r.bottom < -200 || r.top > innerHeight + 200) return;
      const q = limita((alturaTopo() - r.top) / D);
      const k1 = suave(limita((q - PASSAGENS[0][0]) / (PASSAGENS[0][1] - PASSAGENS[0][0])));
      const k2 = suave(limita((q - PASSAGENS[1][0]) / (PASSAGENS[1][1] - PASSAGENS[1][0])));
      // a foto da vez se aproxima da abertura por onde se vai passar (no máximo 8%)
      imgs[0].style.transform = `scale(${(1 + 0.08 * limita(q / 0.42)).toFixed(4)})`;
      imgs[1].style.transform = `scale(${(1.04 - 0.04 * k1 + 0.08 * limita((q - 0.46) / 0.3)).toFixed(4)})`;
      imgs[2].style.transform = `scale(${(1.04 - 0.04 * k2 + 0.04 * limita((q - 0.8) / 0.2)).toFixed(4)})`;
      // aberta de todo, a foto nova passa 2 px da janela e a de baixo some (as bordas não vazam)
      fotos[1].style.clipPath = k1 >= 0.999 ? "inset(-2px)" : recorte(ABERTURAS[0], k1);
      fotos[2].style.clipPath = k2 >= 0.999 ? "inset(-2px)" : recorte(ABERTURAS[1], k2);
      fotos[0].style.visibility = k1 >= 0.999 ? "hidden" : "visible";
      fotos[1].style.visibility = q > PASSAGENS[0][0] - 0.01 && k2 < 0.999 ? "visible" : "hidden";
      fotos[2].style.visibility = q > PASSAGENS[1][0] - 0.01 ? "visible" : "hidden";
      // o halo de luz rebatida segue a foto da vez (fraco: no máximo 50%)
      halos[0].style.opacity = (0.5 * (1 - k1)).toFixed(3);
      halos[1].style.opacity = (0.5 * k1 * (1 - k2)).toFixed(3);
      halos[2].style.opacity = (0.5 * k2).toFixed(3);
      const ativa = q < (PASSAGENS[0][0] + PASSAGENS[0][1]) / 2 ? 0 : q < (PASSAGENS[1][0] + PASSAGENS[1][1]) / 2 ? 1 : 2;
      paradas.forEach((li, i) => {
        li.classList.toggle("ativa", i === ativa);
        const [a, b] = TRECHOS[i];
        li.style.setProperty("--p", limita((q - a) / (b - a)).toFixed(3));
      });
    };
    mede();
    atualiza();
    const fimRolagem = naRolagem(atualiza);
    const fimMedida = naMedida(mede);
    return () => {
      fimRolagem();
      fimMedida();
    };
  }, []);

  return (
    <section className="clinica" id="clinica" aria-labelledby="t-cli" ref={ref} data-sol="30 30 0.65">
      <div className="moldura clinica__cabeca">
        <p className="rotulo">{c.rotulo}</p>
        <Titulo partes={c.titulo} id="t-cli" />
      </div>
      <div className="passeio">
        <div className="passeio__palco">
          <div className="moldura passeio__grade">
            <div className="passeio__lugar">
              {FOTOS.map((f) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={`halo-${f.arquivo}`} className="passeio__halo" src={`/img/${f.arquivo}-480.webp`} alt="" aria-hidden="true" loading="lazy" decoding="async" />
              ))}
              <div className="passeio__janela">
                {FOTOS.map((f, i) => (
                  <figure key={f.arquivo} className="passeio__foto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/img/${f.arquivo}-${f.maior}.webp`}
                      srcSet={`/img/${f.arquivo}-480.webp 480w, /img/${f.arquivo}-${f.maior}.webp ${f.w}w`}
                      sizes="(min-width: 900px) 420px, 100vw"
                      width={f.w}
                      height={f.h}
                      alt={f.alt}
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding="async"
                    />
                  </figure>
                ))}
              </div>
            </div>
            <ol className="passeio__paradas">
              {c.paradas.map((p, i) => (
                <li key={p.nome} className={i === 0 ? "ativa" : ""}>
                  <p className="passeio__nome">
                    <span className="passeio__num">0{i + 1}</span> {p.nome}
                  </p>
                  <p className="passeio__frase">
                    <span className="titulo__forte">{p.forte}</span> <span className="titulo__suave">{p.suave}</span>
                  </p>
                  <span className="passeio__barra">
                    <i />
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
