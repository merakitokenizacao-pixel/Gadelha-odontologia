import * as THREE from "three";
import { FORMAS, type Forma } from "./dente";

// A arcada: os dentes em fila sobre uma parábola, do meio para trás, dos dois lados.
// Cada dente recebe posição e giro para acompanhar a curva (face vestibular para fora).

export type Vaga = {
  forma: Forma;
  nome: string;
  lado: 1 | -1;
  ordem: number; // 0 = central
  pos: THREE.Vector3;
  giro: number; // em torno de y
  tangente: THREE.Vector3;
  normal: THREE.Vector3; // para fora (vestibular)
};

const SUP = ["central", "lateral", "canino", "premolar", "premolar", "molar"] as const;
const INF = ["incisivoInf", "lateralInf", "canino", "premolar", "premolar", "molar"] as const;

// z = -k·x² : a frente da arcada em z = 0, os molares para trás
const K = 0.052;

const comprimento = (x: number) => {
  // comprimento de arco de 0 até x na parábola (integração simples)
  let s = 0;
  const n = 60;
  for (let i = 0; i < n; i++) {
    const a = (x * i) / n;
    const b = (x * (i + 1)) / n;
    const m = (a + b) / 2;
    s += Math.hypot(b - a, 2 * K * m * (b - a));
  }
  return s;
};

const xNoArco = (s: number) => {
  let lo = 0;
  let hi = 40;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (comprimento(m) < s) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
};

export function arcada(inferior = false, quantos = 6, folga = 0.15, posterior = 0.92): Vaga[] {
  const nomes = inferior ? INF : SUP;
  const vagas: Vaga[] = [];
  for (const lado of [1, -1] as const) {
    let s = 0;
    for (let i = 0; i < quantos; i++) {
      const forma = FORMAS[nomes[i]];
      const w = forma.largura * (i >= 3 ? posterior : 1) + folga;
      const centro = s + w / 2;
      s += w;
      const x = xNoArco(centro);
      const z = -K * x * x;
      const tangente = new THREE.Vector3(1, 0, -2 * K * x).normalize();
      const normal = new THREE.Vector3(2 * K * x, 0, 1).normalize();
      vagas.push({
        forma,
        nome: nomes[i],
        lado,
        ordem: i,
        pos: new THREE.Vector3(lado * x, 0, z),
        giro: lado * Math.atan2(2 * K * x, 1),
        tangente: new THREE.Vector3(lado * tangente.x, 0, tangente.z),
        normal: new THREE.Vector3(lado * normal.x, 0, normal.z),
      });
    }
  }
  return vagas;
}
