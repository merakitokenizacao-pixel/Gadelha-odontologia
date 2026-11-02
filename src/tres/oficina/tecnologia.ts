import * as THREE from "three";
import { arcada, type Vaga } from "../arcada";
import { geometriaDente } from "../dente";
import { geometriaGengiva } from "../gengiva";
import type { Formas } from "./formas";

// T5 · O planejamento digital: a arcada de baixo inteira. O escâner lê os dentes de hoje (tortos); a
// simulação os leva, por etapas, ao planejado.
export const vagasTecnologia = () => arcada(true, 6, 0.2);

// os dentes de hoje: giro (rad) e quanto cada um sai para fora da curva (mm), por "lado:ordem" (o bastante
// para a simulação mudar de verdade na tela: mais de 10% do cartão)
const TORTO_TEC: Record<string, [number, number]> = {
  "1:0": [0.52, 1.6],
  "-1:0": [-0.42, -1.25],
  "1:1": [-0.62, -2.1],
  "-1:1": [0.56, 1.7],
  "1:2": [0.32, 2.5],
  "-1:2": [-0.26, 0.95],
};
export const tortoDe = (v: Vaga): [number, number] => TORTO_TEC[`${v.lado}:${v.ordem}`] ?? [0, 0];

// um tremor pequeno e fixo por vértice: o mesmo nas duas poses da mesma malha (a mistura não cintila)
const ruido = (i: number, k: number) => {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s) - 0.5;
};

// A malha digital: triângulos grandes e irregulares (os vértices tremem um pouco, juntos nos triângulos que
// dividem), cada triângulo com as próprias coordenadas baricêntricas (o material desenha as arestas)
function malhaDigital(g: THREE.BufferGeometry, tremor: number) {
  const tremida = g.clone();
  const p = tremida.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i, p.getX(i) + ruido(i, 0) * tremor, p.getY(i) + ruido(i, 1) * tremor * 0.6, p.getZ(i) + ruido(i, 2) * tremor);
  }
  const solta = tremida.toNonIndexed();
  solta.deleteAttribute("color");
  const bary = new Float32Array(solta.attributes.position.count * 3);
  for (let t = 0; t < bary.length; t += 9) {
    bary[t] = 1;
    bary[t + 4] = 1;
    bary[t + 8] = 1;
  }
  solta.setAttribute("aBary", new THREE.BufferAttribute(bary, 3));
  solta.computeVertexNormals();
  return solta;
}

// a gengiva da arcada de baixo; com "torta", estufa em volta dos dentes que saem da curva
const gengivaTec = (torta: boolean, amostras?: [number, number]) =>
  geometriaGengiva(vagasTecnologia(), {
    porParametro: true,
    sobra: 4,
    amostras,
    fora: torta ? (v) => tortoDe(v)[1] * 0.65 : undefined,
  });

// os dentes da malha: coroas de poucos anéis (de 60 a 150 triângulos por dente à vista); a simulação, vista
// de perto, usa anéis mais finos para a malha ter na tela a mesma densidade da do escaneamento
const dentesMalha = (fina = false) =>
  vagasTecnologia().map((v, i) => malhaDigital(geometriaDente(v.forma, fina ? { segmentos: 13, aneis: [6, 4] } : { segmentos: 9, aneis: [4, 3] }), (0.22 + 0.02 * (i % 3)) * (fina ? 0.7 : 1)));
const GENGIVA_MALHA: [number, number] = [78, 16];

export function formasEscaneamento(): Formas {
  return {
    dentes: vagasTecnologia().map((v) => geometriaDente(v.forma, { segmentos: 34 })),
    malhas: dentesMalha(),
    gengiva: gengivaTec(true),
    gengivaMalha: malhaDigital(gengivaTec(true, GENGIVA_MALHA), 0.3),
  };
}

export function formasSimulacao(): Formas {
  return {
    malhas: dentesMalha(true),
    gengivaTorta: malhaDigital(gengivaTec(true, GENGIVA_MALHA), 0.3),
    gengivaCerta: malhaDigital(gengivaTec(false, GENGIVA_MALHA), 0.3),
  };
}
