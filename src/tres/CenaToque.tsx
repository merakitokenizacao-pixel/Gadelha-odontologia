"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { desmarcaCenaPronta, registraDesenho, useCenaPronta } from "@/lib/tres";
import { FILMES } from "./filme";
import { CENAS } from "./Cenas3D";

// No celular e no tablet: a cena com a tela 3D dela, dentro da caixa do cartão. A tela é uma peça da página,
// e o dedo a leva junto com o resto, sem esperar o JavaScript.
// - Só desenha depois de preparada, e só quando o filme dela anda (30 quadros por segundo bastam para estes
//   filmes lentos e poupam a bateria).
// - Se o aparelho não dá conta, a resolução cai antes de o filme começar a travar.
const INTERVALO = 1000 / 30 - 2;
const PIXELS_MAX = 2;
const PIXELS_MIN = 1;

function Portao({ id, visivel }: { id: string; visivel: boolean }) {
  const pronta = useCenaPronta(id);
  const invalidate = useThree((s) => s.invalidate);
  const setDpr = useThree((s) => s.setDpr);
  const estado = useRef({ pronta, visivel, ultimoP: Number.NaN, ultimoDesenho: 0, adiado: 0, antes: 0, lentos: 0, pixels: PIXELS_MAX });

  useEffect(() => {
    estado.current.pronta = pronta;
    estado.current.visivel = visivel;
    invalidate();
  }, [pronta, visivel, invalidate]);

  useEffect(() => {
    const e = estado.current;
    const fim = registraDesenho(() => {
      const p = FILMES[id]?.p ?? 0;
      if (p === e.ultimoP) return;
      const agora = performance.now();
      const falta = INTERVALO - (agora - e.ultimoDesenho);
      if (falta > 0) {
        // o último quadro do filme não pode ficar para trás: se nada mais pedir, ele sai sozinho
        clearTimeout(e.adiado);
        e.adiado = window.setTimeout(() => {
          e.ultimoP = FILMES[id]?.p ?? 0;
          e.ultimoDesenho = performance.now();
          invalidate();
        }, falta + 1);
        return;
      }
      clearTimeout(e.adiado);
      e.ultimoP = p;
      e.ultimoDesenho = agora;
      invalidate();
    });
    return () => {
      clearTimeout(e.adiado);
      fim();
    };
  }, [id, invalidate]);

  // prioridade 1: a partir daqui, quem desenha é este portão
  useFrame((s) => {
    const e = estado.current;
    if (!e.pronta || !e.visivel) return;
    const inicio = performance.now();
    s.gl.render(s.scene, s.camera);
    // aparelho lento: o intervalo entre dois quadros seguidos passa de 50 ms; 20 vezes seguidas, baixa a resolução
    if (e.antes && inicio - e.antes < 200) {
      e.lentos = inicio - e.antes > 50 ? e.lentos + 1 : Math.max(0, e.lentos - 1);
      if (e.lentos >= 20 && e.pixels > PIXELS_MIN) {
        e.lentos = 0;
        e.pixels = Math.max(PIXELS_MIN, e.pixels - 0.5);
        setDpr(Math.min(window.devicePixelRatio, e.pixels));
      }
    }
    e.antes = inicio;
  }, 1);

  return null;
}

export function CenaToque({ id, className, visivel }: { id: string; className: string; visivel: boolean }) {
  const cena = CENAS[id];

  // saindo de perto da tela, a tela 3D vai embora e o pôster volta
  useEffect(() => () => desmarcaCenaPronta(id), [id]);

  if (!cena) return null;
  return (
    <div className={className}>
      <Canvas
        frameloop="demand"
        shadows="percentage"
        dpr={[PIXELS_MIN, PIXELS_MAX]}
        // a tela anda com a página: rolar não muda nada para ela (só um novo tamanho de caixa)
        resize={{ scroll: false, debounce: { scroll: 0, resize: 100 } }}
        gl={{ alpha: true, antialias: true, stencil: false, premultipliedAlpha: true }}
        onCreated={({ gl }) => {
          gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
          gl.localClippingEnabled = true;
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
        style={{ pointerEvents: "none" }}
      >
        {cena()}
        <Portao id={id} visivel={visivel} />
      </Canvas>
    </div>
  );
}
