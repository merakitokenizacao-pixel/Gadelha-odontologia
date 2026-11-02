import * as THREE from "three";
import type { Vaga } from "./arcada";
import { COR_GENGIVA } from "./materiais";

// A gengiva: uma faixa que acompanha a arcada por baixo dos dentes. A crista sobe entre os dentes
// (as papilas) e desce no meio de cada um, e os dentes saem dela.

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export type OpcoesGengiva = {
  margem?: number; // altura da gengiva no meio do dente (mm acima do colo)
  papila?: number; // quanto a crista sobe entre os dentes
  folga?: number; // quanto a gengiva passa da espessura do dente, de cada lado
  fundo?: number; // até onde as paredes descem
  sobra?: number; // quanto a faixa passa do último dente
  // amostra pelo parâmetro da curva (cada trecho entre dentes com o mesmo número de amostras): duas gengivas
  // de poses diferentes ficam com os vértices correspondentes e podem ser misturadas sem dobrar
  porParametro?: boolean;
  // quanto a gengiva estufa para fora (ou entra) em volta de cada dente fora do lugar, em mm; a curva do
  // meio continua a da arcada (passar a curva pelos dentes deslocados fazia uma dobra fechada demais)
  fora?: (v: Vaga) => number;
  // quão perto do meio da faixa a papila fica: 14 = só no alto (vista de cima); 3 = também na parede da
  // frente, enchendo o vão entre os dentes até perto do contato (vista de frente)
  expoentePapila?: number;
  // amostras ao longo da arcada e de um lado a outro da faixa (280 e 44): poucas = a malha digital
  amostras?: [number, number];
};

export function geometriaGengiva(vagas: Vaga[], op: OpcoesGengiva = {}): THREE.BufferGeometry {
  const margem = op.margem ?? 1.1;
  const papila = op.papila ?? 2.8;
  const folga = op.folga ?? 1.9;
  const fundo = op.fundo ?? 9;
  const sobra = op.sobra ?? 3;

  // ordena da esquerda (lado -1, mais ao fundo) para a direita, passando pelo meio
  const fila = [...vagas].sort((a, b) => a.lado * (a.ordem + 0.5) - b.lado * (b.ordem + 0.5));
  // posições ao longo da fila: centros e larguras
  const pontos = fila.map((v) => v.pos.clone());
  const larguras = fila.map((v) => v.forma.largura);
  const esp = fila.map((v) => v.forma.espessura / 2);

  // amostra uma curva lisa pelos centros, com sobra nas pontas
  const ini = pontos[0].clone().add(pontos[0].clone().sub(pontos[1]).setLength(larguras[0] / 2 + sobra));
  const fim = pontos[pontos.length - 1].clone().add(pontos[pontos.length - 1].clone().sub(pontos[pontos.length - 2]).setLength(larguras[larguras.length - 1] / 2 + sobra));
  const curva = new THREE.CatmullRomCurve3([ini, ...pontos, fim], false, "centripetal");

  const S = op.amostras?.[0] ?? 280;
  const F = op.amostras?.[1] ?? 44;
  const pos: number[] = [];
  const cor: number[] = [];
  const cCrista = new THREE.Color(COR_GENGIVA.crista);
  const cFundo = new THREE.Color(COR_GENGIVA.fundo);

  for (let i = 0; i <= S; i++) {
    const u = i / S;
    const p = op.porParametro ? curva.getPoint(u) : curva.getPointAt(u);
    const t = op.porParametro ? curva.getTangent(u) : curva.getTangentAt(u);
    const n = new THREE.Vector3(t.z, 0, -t.x); // normal no plano
    // garante que a normal aponte para fora da arcada
    if (n.dot(new THREE.Vector3(p.x, 0, p.z + 20)) < 0) n.negate();

    // dente mais próximo e distância relativa ao centro dele
    let melhor = 0;
    let dist = Infinity;
    for (let k = 0; k < pontos.length; k++) {
      const d = p.distanceTo(pontos[k]);
      if (d < dist) {
        dist = d;
        melhor = k;
      }
    }
    // espessura e largura misturadas entre os dois dentes mais próximos: sem degrau (era a "emenda de tubos";
    // com a largura de um dente só, a papila saltava onde o mais próximo trocava)
    let segundo = melhor === 0 ? 1 : melhor - 1;
    for (let k = 0; k < pontos.length; k++) if (k !== melhor && p.distanceTo(pontos[k]) < p.distanceTo(pontos[segundo])) segundo = k;
    const d2 = p.distanceTo(pontos[segundo]);
    const pesoSeg = Math.max(0, Math.min(0.5, 0.5 * (1 - (d2 - dist) / (larguras[melhor] * 0.6))));
    const espLiso = esp[melhor] * (1 - pesoSeg) + esp[segundo] * pesoSeg;
    const rel = dist / ((larguras[melhor] * (1 - pesoSeg) + larguras[segundo] * pesoSeg) / 2);
    const nasPontas = Math.min(u, 1 - u) * S < 8 ? suave(0, 8, Math.min(u, 1 - u) * S) : 1;
    // a papila sobe em arco (redonda), não em agulha, e enche o espaço até o contato
    const arco = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, (rel - 0.32) / 0.72)));
    const crista = (margem + papila * Math.pow(arco, 0.85)) * nasPontas - (1 - nasPontas) * 2;
    const W = (espLiso + folga) * (0.55 + 0.45 * nasPontas);

    // a base da crista é lisa; o recorte das papilas fica só perto do topo
    const base = margem * nasPontas - (1 - nasPontas) * 2;
    // a raiz de cada dente faz um relevo suave na parede da frente
    const relevo = 0.32 * Math.pow(Math.cos(Math.min(1, rel / 1.25) * Math.PI / 2), 2);
    // em volta de um dente fora do lugar, a faixa inteira anda junto, numa lombada larga e lisa
    if (op.fora) {
      let off = 0;
      for (let k = 0; k < pontos.length; k++) {
        const f = op.fora(fila[k]);
        if (!f) continue;
        const r = larguras[k] / 2 + 3.5;
        off += f * Math.pow(Math.cos((Math.PI / 2) * Math.min(1, p.distanceTo(pontos[k]) / r)), 2);
      }
      p.addScaledVector(n, off);
    }
    for (let j = 0; j <= F; j++) {
      const phi = (j / F) * Math.PI;
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      const m = 3.2;
      const sm = Math.pow(s, 2 / m);
      const dn = -W * Math.sign(c) * Math.pow(Math.abs(c), 2 / m) * (1 + (c < 0 ? relevo / W : 0) * (1 - Math.pow(sm, 6)));
      const dy = (base + fundo) * sm - fundo + (crista - base) * Math.pow(sm, op.expoentePapila ?? 14);
      pos.push(p.x + n.x * dn, dy, p.z + n.z * dn);
      const k = suave(-fundo, crista, dy);
      const cc = cFundo.clone().lerp(cCrista, k);
      cor.push(cc.r, cc.g, cc.b);
    }
  }

  const idx: number[] = [];
  for (let i = 0; i < S; i++) {
    for (let j = 0; j < F; j++) {
      const a = i * (F + 1) + j;
      const b = a + 1;
      const c = a + F + 1;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
