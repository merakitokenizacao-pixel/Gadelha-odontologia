"use client";

import { pedeDesenho } from "./tres";

// Tudo o que depende da rolagem passa por um quadro só (requestAnimationFrame), como na v26.
type Tarefa = () => void;

const aoRolar = new Set<Tarefa>();
const aoMedir = new Set<Tarefa>();
let pedido = false;
let ligado = false;

export function pedeQuadro() {
  if (pedido) return;
  pedido = true;
  requestAnimationFrame(() => {
    pedido = false;
    aoRolar.forEach((f) => f());
    pedeDesenho();
  });
}

function liga() {
  if (ligado || typeof window === "undefined") return;
  ligado = true;
  addEventListener("scroll", pedeQuadro, { passive: true });
  addEventListener("resize", () => {
    aoMedir.forEach((f) => f());
    pedeQuadro();
  });
}

export function naRolagem(f: Tarefa) {
  liga();
  aoRolar.add(f);
  pedeQuadro();
  return () => {
    aoRolar.delete(f);
  };
}

export function naMedida(f: Tarefa) {
  liga();
  aoMedir.add(f);
  return () => {
    aoMedir.delete(f);
  };
}

export const alturaTopo = () => (document.querySelector<HTMLElement>(".topo")?.offsetHeight ?? 80);

// rola até um ponto: pelo Lenis quando ele está ligado (rolagem suave), senão pelo navegador
export function rolaAte(y: number, imediato = false) {
  const lenis = (window as unknown as { __lenis?: { scrollTo: (y: number, o?: object) => void } }).__lenis;
  if (lenis && !imediato) lenis.scrollTo(y, { duration: 1.1 });
  else window.scrollTo({ top: y, behavior: imediato ? "instant" : "smooth" });
}
