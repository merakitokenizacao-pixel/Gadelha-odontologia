"use client";

import { useEffect, useRef } from "react";
import { COPY, LINKS } from "@/lib/conteudo";

// O 30 e o 10 mil desenhados no mesmo traço da espiral, sem foto.
export function Experiencia() {
  const ref = useRef<HTMLElement>(null);
  const t = COPY.experiencia;

  useEffect(() => {
    const blocos = ref.current?.querySelectorAll("[data-revela]");
    if (!blocos) return;
    const olho = new IntersectionObserver(
      (itens) => {
        for (const it of itens)
          if (it.isIntersecting) {
            it.target.classList.add("visivel");
            olho.unobserve(it.target);
          }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    blocos.forEach((b) => olho.observe(b));
    return () => olho.disconnect();
  }, []);

  return (
    <section className="experiencia" aria-labelledby="t-exp" ref={ref} data-sol="44 26 0.2">
      <div className="moldura experiencia__grade">
        <div className="experiencia__trinta" data-revela>
          <svg className="numero-desenhado" viewBox="0 0 230 192" aria-hidden="true">
            <path pathLength={1} d="M10,46 C14,22 34,10 54,10 C78,10 94,26 94,50 C94,74 76,90 50,90 C80,90 100,110 100,136 C100,164 78,182 52,182 C28,182 10,168 6,146" />
            <path pathLength={1} d="M177,10 C203,10 224,48 224,96 C224,144 203,182 177,182 C151,182 130,144 130,96 C130,48 151,10 177,10 Z" />
          </svg>
          <h2 id="t-exp" className="titulo titulo--quebra visivel experiencia__titulo">
            <span className="sr-only">30 </span>
            <span className="titulo__forte">{t.titulo[0]}</span> <span className="titulo__suave">{t.titulo[1]}</span>
          </h2>
          <p className="experiencia__areas">
            {t.areas.map((a, i) => (
              <span key={a}>
                <span className="experiencia__area">
                  {a}
                  {i < t.areas.length - 1 ? <i> ·</i> : null}
                </span>{" "}
              </span>
            ))}
          </p>
        </div>
        <div className="experiencia__pacientes" data-revela>
          <div className="experiencia__mil pendente" data-pendente="OK da clínica para publicar o número">
            <p className="experiencia__cerca">
              {t.cerca}
              <span className="sr-only"> 10 mil</span>
            </p>
            <svg className="numero-desenhado numero-desenhado--mil" viewBox="0 0 392 192" aria-hidden="true">
              <path pathLength={1} d="M14,40 L44,10 L44,182" />
              <path pathLength={1} d="M110,10 C134,10 154,48 154,96 C154,144 134,182 110,182 C86,182 66,144 66,96 C66,48 86,10 110,10 Z" />
              <path pathLength={1} d="M196,182 L196,87 M196,118 C196,98 210,87 226,87 C242,87 254,98 254,118 L254,182 M254,118 C254,98 268,87 284,87 C300,87 312,98 312,118 L312,182" />
              <path pathLength={1} d="M344,182 L344,87" />
              <circle className="pingo" cx="344" cy="54" r="5" />
              <path pathLength={1} d="M376,10 L376,182" />
            </svg>
          </div>
          <p className="experiencia__texto">{t.pacientes}</p>
          <a className="link-seta" href={LINKS.retorno} target="_blank" rel="noopener">
            {t.retorno}
          </a>
        </div>
      </div>
    </section>
  );
}
