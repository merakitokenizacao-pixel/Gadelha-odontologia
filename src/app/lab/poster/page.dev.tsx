"use client";

// Pôster (não vai para o site): uma cena 3D parada num quadro, sem fundo, para virar a imagem que aparece até o
// 3D carregar e, sempre, para quem pede menos movimento. Quando a cena fica pronta, marca o <body> para a
// ferramenta (ferramentas/posteres.mjs) tirar a foto.
// /lab/poster?cena=implante&p=1&l=1100&a=1100
import { View } from "@react-three/drei";
import { useEffect, useState } from "react";
import { useCenaPronta } from "@/lib/tres";
import { Palco } from "@/tres/Palco";
import { CENAS_LAB } from "../cenas";

export default function Poster() {
  const [cfg, setCfg] = useState<{ cena: string; p: number; l: number; a: number } | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setCfg({ cena: q.get("cena") ?? "implante", p: Number(q.get("p") ?? 1), l: Number(q.get("l") ?? 1000), a: Number(q.get("a") ?? 1000) });
  }, []);
  const pronta = useCenaPronta(cfg?.cena ?? "");
  useEffect(() => {
    if (!pronta) return;
    // alguns quadros depois de pronta (sombras e texturas assentadas)
    const t = window.setTimeout(() => (document.body.dataset.pronto = "1"), 900);
    return () => clearTimeout(t);
  }, [pronta]);
  if (!cfg) return null;
  return (
    <main>
      {/* sem fundo e sem o botão de desenvolvimento do Next (ele entrava na foto) */}
      <style>{"html, body { background: transparent !important; margin: 0; overflow: hidden; } nextjs-portal { display: none !important; }"}</style>
      <div style={{ position: "fixed", left: 0, top: 0, width: cfg.l, height: cfg.a }}>
        <View style={{ position: "absolute", inset: 0 }}>{CENAS_LAB[cfg.cena]?.(cfg.p)}</View>
      </div>
      <Palco />
    </main>
  );
}
