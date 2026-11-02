"use client";

import { useSyncExternalStore } from "react";

// "Menos movimento" do sistema. useSyncExternalStore com o servidor em false: a hidratação não quebra
// (o useReducedMotion da framer-motion quebrava, na landing da Nutri).
const CONSULTA = "(prefers-reduced-motion: reduce)";

const assina = (aviso: () => void) => {
  const m = matchMedia(CONSULTA);
  m.addEventListener("change", aviso);
  return () => m.removeEventListener("change", aviso);
};

export const useMenosMovimento = () =>
  useSyncExternalStore(
    assina,
    () => matchMedia(CONSULTA).matches,
    () => false,
  );

export const menosMovimento = () => typeof window !== "undefined" && matchMedia(CONSULTA).matches;

export const limita = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const entre = (a: number, b: number, t: number) => limita((t - a) / (b - a));
export const mistura = (a: number, b: number, t: number) => a + (b - a) * t;
