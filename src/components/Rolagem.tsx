"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Rolagem suave (Lenis) no ritmo do GSAP. Quem pede menos movimento fica com a rolagem do sistema.
export function Rolagem() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 0.95, anchors: { offset: -84 } });
    lenis.on("scroll", ScrollTrigger.update);
    const tique = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tique);
    gsap.ticker.lagSmoothing(0);
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    return () => {
      gsap.ticker.remove(tique);
      lenis.destroy();
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
    };
  }, []);
  return null;
}
