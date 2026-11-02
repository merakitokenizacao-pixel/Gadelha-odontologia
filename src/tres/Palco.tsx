"use client";

import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { useEffect } from "react";
import * as THREE from "three";
import { registraDesenho } from "@/lib/tres";

// Uma tela WebGL só para a página inteira, presa à janela e à frente do conteúdo (sem receber cliques).
// Cada cena 3D é uma <View> dentro da sua caixa no HTML: a tela desenha cada uma no retângulo da caixa,
// e só as que estão à vista. Tone mapping neutro (guarda a cor do material: o marfim fica marfim).
// Desenha só quando pedem (frameloop "demand"): a rolagem, os filmes e os laços chamam pedeDesenho().
export function Palco() {
  useEffect(() => () => registraDesenho(null), []);
  return (
    <Canvas
      className="palco3d"
      frameloop="demand"
      shadows="percentage"
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance", stencil: false, premultipliedAlpha: true }}
      onCreated={({ gl, invalidate }) => {
        registraDesenho(invalidate);
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
