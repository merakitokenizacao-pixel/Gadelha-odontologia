"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { marcaCenaPronta, pedeDesenho } from "@/lib/tres";
import { salaDe } from "./Ambiente";

// A placa de vídeo leva tempo para preparar cada material, e a página inteira fica parada se ele for usado
// antes de ficar pronto (no Windows, segundos por material). Aqui a preparação é pedida antes e corre em
// segundo plano, uma cena de cada vez; a cena só é desenhada quando termina, e o pôster fica na tela até lá.
let fila: Promise<unknown> = Promise.resolve();

// um limite para uma placa que nunca responda não deixar o pôster na tela para sempre
const LIMITE = 45000;

// As lupas desenham numa textura, e o programa dela é outro (sem o acabamento de cor da tela).
const texturas = new WeakMap<THREE.WebGLRenderer, THREE.WebGLRenderTarget>();
const texturaDe = (gl: THREE.WebGLRenderer) => {
  let t = texturas.get(gl);
  if (!t) {
    t = new THREE.WebGLRenderTarget(1, 1);
    texturas.set(gl, t);
  }
  return t;
};

// Vai por último na cena (com as formas já na tela): `id` avisa que a cena inteira está pronta; `naTextura`
// prepara a parte que desenha numa textura, sem avisar.
export function Preparo({ id, naTextura = false }: { id?: string; naTextura?: boolean }) {
  const get = useThree((s) => s.get);

  useEffect(() => {
    let vivo = true;
    // saindo de cena no meio do trabalho, a fila segue na hora para a próxima
    let solta = () => {};
    const avisa = () => {
      if (!vivo || !id) return;
      marcaCenaPronta(id);
      pedeDesenho();
    };
    fila = fila
      .then(async () => {
        if (!vivo) return;
        const { gl, scene, camera } = get();
        // os materiais dependem da sala dos reflexos: ela vem antes
        const sala = await salaDe(gl).catch(() => null);
        if (!vivo) return;
        if (sala) scene.environment = sala;
        const antes = gl.getRenderTarget();
        if (naTextura) gl.setRenderTarget(texturaDe(gl));
        const trabalho = gl.compileAsync(scene, camera);
        gl.setRenderTarget(antes);
        await Promise.race([trabalho, new Promise((ok) => setTimeout(ok, LIMITE)), new Promise<void>((ok) => (solta = ok))]);
      })
      .catch(() => {})
      .then(avisa);
    return () => {
      vivo = false;
      solta();
    };
  }, [get, id, naTextura]);

  return null;
}
