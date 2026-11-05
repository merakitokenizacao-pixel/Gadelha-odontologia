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
// não gasta a bateria. Cada tela registra aqui o pedido de quadro dela (no computador há uma tela só; no
// celular, uma por cena perto da tela).
const desenhos = new Set<() => void>();
export const registraDesenho = (f: () => void) => {
  desenhos.add(f);
  return () => {
    desenhos.delete(f);
  };
};
export const pedeDesenho = () => desenhos.forEach((f) => f());

// Cena pronta = com os materiais preparados pela placa de vídeo (Preparo.tsx). Até lá, ela não é desenhada
// e o pôster fica na tela.
const prontas = new Set<string>();
const avisosCena = new Set<() => void>();

export function marcaCenaPronta(id: string) {
  if (prontas.has(id)) return;
  prontas.add(id);
  avisosCena.forEach((f) => f());
}

export function desmarcaCenaPronta(id: string) {
  if (prontas.delete(id)) avisosCena.forEach((f) => f());
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

// Celular e tablet: o dedo rola a página sem esperar o JavaScript. Uma tela presa à janela ficaria para trás
// da página (o desenho parecia vir junto com o dedo), então lá cada cena tem a própria tela, dentro da caixa
// dela, e só as que estão perto da tela existem (Cena.tsx, CenaToque.tsx).
const CONSULTA_TOQUE = "(hover: none), (pointer: coarse)";
export const ehToque = () => typeof window !== "undefined" && matchMedia(CONSULTA_TOQUE).matches;
export const useToque = () =>
  useSyncExternalStore(
    (f) => {
      const m = matchMedia(CONSULTA_TOQUE);
      m.addEventListener("change", f);
      return () => m.removeEventListener("change", f);
    },
    ehToque,
    () => false,
  );

const perto = new Set<string>();
const avisosPerto = new Set<() => void>();

export function marcaPerto(id: string, sim: boolean) {
  if (sim === perto.has(id)) return;
  if (sim) perto.add(id);
  else perto.delete(id);
  avisosPerto.forEach((f) => f());
}

export const useCenaPerto = (id: string) =>
  useSyncExternalStore(
    (f) => {
      avisosPerto.add(f);
      return () => avisosPerto.delete(f);
    },
    () => perto.has(id),
    () => false,
  );
