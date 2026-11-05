"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { COPY } from "@/lib/conteudo";
import { useToque } from "@/lib/tres";
import { FILMES } from "@/tres/filme";

// As etiquetas dos filmes. No computador, numa camada própria presa à janela e acima da tela 3D (dentro do
// trilho, que anda por transform, elas ficavam por baixo do desenho): a cada quadro, enquanto a vitrine está à
// vista, cada etiqueta vai para o seu ponto na caixa do desenho. No celular e no tablet, a tela 3D é uma peça
// da página: a etiqueta fica dentro da caixa, e o dedo leva as duas juntas. Nos dois, ela acende na sua fase do
// filme.
export function Etiquetas() {
  const toque = useToque();
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  useEffect(() => {
    if (!montado) return;
    const dados = [...document.querySelectorAll<HTMLElement>(".etiqueta")].map((el) => ({
      el,
      id: el.dataset.id!,
      x: Number(el.dataset.x),
      y: Number(el.dataset.y),
      de: Number(el.dataset.de),
      ate: Number(el.dataset.ate),
      arte: document.querySelector<HTMLElement>(`#trat-${el.dataset.id} .trat__arte`),
    }));
    const vitrine = document.querySelector(".vitrine");
    if (!vitrine) return;
    let vivo = false;
    let quadro = 0;
    const apaga = () => dados.forEach((d) => (d.el.style.opacity = "0"));
    const passo = () => {
      for (const d of dados) {
        const p = FILMES[d.id]?.p ?? 0;
        const op = Math.max(0, Math.min(1, (p - d.de) * 30, (d.ate - p) * 30));
        if (op <= 0 || !d.arte) {
          if (d.el.style.opacity !== "0") d.el.style.opacity = "0";
          continue;
        }
        d.el.style.opacity = op.toFixed(3);
        if (!toque) {
          const r = d.arte.getBoundingClientRect();
          d.el.style.transform = `translate(${(r.left + r.width * d.x).toFixed(1)}px, ${(r.top + r.height * d.y).toFixed(1)}px) translate(-50%, -50%)`;
        }
      }
      if (vivo) quadro = requestAnimationFrame(passo);
    };
    const olho = new IntersectionObserver(([e]) => {
      vivo = e.isIntersecting;
      cancelAnimationFrame(quadro);
      if (vivo) quadro = requestAnimationFrame(passo);
      else apaga();
    });
    olho.observe(vitrine);
    return () => {
      olho.disconnect();
      cancelAnimationFrame(quadro);
    };
  }, [montado, toque]);

  if (!montado) return null;
  const lista = COPY.tratamentos.lista;
  const dele = (t: (typeof lista)[number]) =>
    (t.etiquetas ?? []).map((e) => (
      <span
        key={`${t.id}-${e.texto}`}
        className="etiqueta"
        data-id={t.id}
        data-x={parseFloat(e.x) / 100}
        data-y={parseFloat(e.y) / 100}
        data-de={e.de}
        data-ate={e.ate}
        style={toque ? { left: e.x, top: e.y, transform: "translate(-50%, -50%)", zIndex: 2 } : undefined}
      >
        {e.texto}
      </span>
    ));

  if (toque) {
    return (
      <>
        {lista.map((t) => {
          const arte = document.querySelector(`#trat-${t.id} .trat__arte`);
          return arte ? createPortal(dele(t), arte, t.id) : null;
        })}
      </>
    );
  }
  return createPortal(
    <div className="etiquetas" aria-hidden="true">
      {lista.flatMap(dele)}
    </div>,
    document.body,
  );
}
