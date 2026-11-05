"use client";

import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { pedeDesenho, registraDesenho } from "@/lib/tres";

// Computador: uma tela WebGL só para a página inteira, presa à janela e à frente do conteúdo (sem receber
// cliques). Cada cena 3D é uma <View> dentro da sua caixa no HTML: a tela desenha cada uma no retângulo da
// caixa, e só as que estão à vista. Tone mapping neutro (guarda a cor do material: o marfim fica marfim).
// Desenha só quando pedem (frameloop "demand"): a rolagem, os filmes e os laços chamam pedeDesenho().
// Longe das seções com 3D, a tela sai de cena: transparente e do tamanho da janela, ela custaria à placa de
// vídeo a cada quadro da rolagem sem mostrar nada.
export function Palco() {
  const fim = useRef<(() => void) | null>(null);
  useEffect(() => () => fim.current?.(), []);
  useEffect(() => {
    const secoes = [...document.querySelectorAll(".vitrine, .tecnologia__lista")];
    const tela = document.querySelector<HTMLElement>(".palco3d");
    if (!secoes.length || !tela) return;
    const aVista = new Set<Element>();
    const olho = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (e.isIntersecting) aVista.add(e.target);
          else aVista.delete(e.target);
        }
        tela.style.visibility = aVista.size ? "visible" : "hidden";
        if (aVista.size) pedeDesenho();
      },
      { rootMargin: "10% 0px" },
    );
    secoes.forEach((s) => olho.observe(s));
    return () => olho.disconnect();
  }, []);
  return (
    <Canvas
      className="palco3d"
      frameloop="demand"
      shadows="percentage"
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance", stencil: false, premultipliedAlpha: true }}
      onCreated={({ gl, invalidate }) => {
        fim.current?.();
        fim.current = registraDesenho(invalidate);
        gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
        gl.localClippingEnabled = true;
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.0;
      }}
      style={{ position: "fixed", inset: 0, pointerEvents: "none" }}
    >
      <View.Port />
    </Canvas>
  );
}
