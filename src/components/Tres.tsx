"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { liberaTres, useTresLiberado } from "@/lib/tres";

// Carrega a tela 3D (three.js) só depois que a espiral se desenha, no momento ocioso, ou na primeira
// rolagem. Até lá (e sempre, para quem pede menos movimento), cada desenho mostra o quadro final.
const Palco = dynamic(() => import("@/tres/Palco").then((m) => m.Palco), { ssr: false });

export function Tres() {
  const liberado = useTresLiberado();

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ric = (window as unknown as { requestIdleCallback?: (f: () => void, o?: object) => number }).requestIdleCallback?.bind(window);
    const ocioso = (f: () => void) => (ric ? ric(f, { timeout: 1500 }) : window.setTimeout(f, 200));
    // a espiral leva ~3,2 s para se desenhar, a contar da primeira pintura
    const t = window.setTimeout(() => ocioso(liberaTres), 3800);
    const rolou = () => {
      if (scrollY > innerHeight * 0.25) liberaTres();
    };
    addEventListener("scroll", rolou, { passive: true });
    return () => {
      clearTimeout(t);
      removeEventListener("scroll", rolou);
    };
  }, []);

  return liberado ? <Palco /> : null;
}
