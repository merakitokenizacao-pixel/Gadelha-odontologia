"use client";

import { createElement, useEffect, useRef } from "react";
import type { Titulo as Partes } from "@/lib/conteudo";

// Título em duas cores: a afirmação na tinta e a continuação mais clara. Cada parte sobe por trás de uma
// máscara quando o título chega à tela; a segunda chega 120 ms depois.
export function Titulo({
  partes,
  nivel = "h2",
  id,
  className = "",
  quebra = true,
}: {
  partes: Partes;
  nivel?: "h1" | "h2" | "h3";
  id?: string;
  className?: string;
  quebra?: boolean;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const olho = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("visivel");
          olho.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.2 },
    );
    olho.observe(el);
    return () => olho.disconnect();
  }, []);

  return createElement(
    nivel,
    { ref, id, className: `titulo ${quebra ? "titulo--quebra" : ""} ${className}`.trim() },
    <span className="titulo__mascara">
      <span className="titulo__forte">{partes[0]}</span>
    </span>,
    " ",
    <span className="titulo__mascara">
      <span className="titulo__suave">{partes[1]}</span>
    </span>,
  );
}
