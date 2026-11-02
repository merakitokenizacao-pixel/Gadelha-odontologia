"use client";

import { useSyncExternalStore } from "react";

// Quando o 3D pode carregar: depois que a espiral da abertura termina de se desenhar (no momento ocioso)
// ou assim que a pessoa começa a rolar, o que vier primeiro. Quem pede menos movimento não carrega o 3D
// (vê os quadros finais renderizados antes).
let pronto = false;
const avisos = new Set<() => void>();

export function liberaTres() {
  if (pronto) return;
  pronto = true;
  document.documentElement.classList.add("tres-liberado");
  avisos.forEach((f) => f());
}

// A tela 3D desenha só quando alguém pede (a rolagem, um filme andando, um laço da tecnologia): parada, ela
// não gasta a bateria. O palco registra aqui o pedido de quadro do R3F.
let desenho: (() => void) | null = null;
export const registraDesenho = (f: (() => void) | null) => {
  desenho = f;
};
export const pedeDesenho = () => desenho?.();

const prontas = new Set<string>();
const avisosCena = new Set<() => void>();

export function marcaCenaPronta(id: string) {
  if (prontas.has(id)) return;
  prontas.add(id);
  avisosCena.forEach((f) => f());
}

export const useCenaPronta = (id: string) =>
  useSyncExternalStore(
    (f) => {
      avisosCena.add(f);
      return () => avisosCena.delete(f);
    },
    () => prontas.has(id),
    () => false,
  );

export const useTresLiberado = () =>
  useSyncExternalStore(
    (f) => {
      avisos.add(f);
      return () => avisos.delete(f);
    },
    () => pronto,
    () => false,
  );
