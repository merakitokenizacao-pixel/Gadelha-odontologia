import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Dente gerado por código: uma superelipse que sobe do ápice da raiz até o topo da coroa.
// Unidades em milímetros. Coroa para +y, face vestibular (a da frente) para +z, mesiodistal em x.

export type Cuspide = { x: number; z: number; h: number; r: number };

export type Forma = {
  altura: number; // altura da coroa, do colo à borda
  largura: number; // largura mesiodistal máxima
  espessura: number; // espessura vestíbulo-lingual no colo
  colo: number; // largura no colo / largura máxima
  alarga?: number; // altura relativa em que a coroa chega à largura máxima (0,55 de padrão)
  convexa?: boolean; // do colo ao ponto mais largo em curva convexa (seno), sem a coroa "voltar para dentro"
  bojo?: number; // quanto a coroa estufa no meio (os posteriores quase não estufam)
  borda: number; // espessura no topo / espessura no colo
  ponta: number; // cúspide acima da borda (canino)
  cantos: number; // queda dos cantos da borda
  topo: number; // altura da cúpula do topo
  ombro: number; // quanto o topo se recolhe antes da cúpula (posteriores)
  cuspides: Cuspide[];
  sulco?: boolean; // sulco vertical na face de fora (molar)
  sulcoCentral?: boolean; // o sulco de um lado a outro entre as cúspides de fora e de dentro (pré-molar)
  palatina?: boolean; // face de trás côncava, com o cíngulo junto ao colo (incisivos de cima)
  cuspideRedonda?: boolean; // a ponta do canino arredondada
  raiz: number;
  n: number; // expoente da superelipse
};

export const FORMAS: Record<string, Forma> = {
  central: { altura: 10.5, largura: 8.6, espessura: 7.0, colo: 0.74, borda: 0.3, ponta: 0, cantos: 0.7, topo: 0.5, ombro: 0.02, cuspides: [], palatina: true, raiz: 13, n: 2.7 },
  lateral: { altura: 9.0, largura: 6.6, espessura: 6.0, colo: 0.72, borda: 0.3, ponta: 0, cantos: 1.0, topo: 0.5, ombro: 0.02, cuspides: [], palatina: true, raiz: 13, n: 2.5 },
  canino: { altura: 10.0, largura: 7.6, espessura: 8.0, colo: 0.68, alarga: 0.6, borda: 0.34, ponta: 2.0, cantos: 0.3, topo: 0.5, ombro: 0.03, cuspides: [], raiz: 16, n: 2.2 },
  premolar: {
    altura: 8.2, largura: 7.0, espessura: 9.0, colo: 0.78, borda: 0.8, ponta: 0, cantos: 0, topo: 0.9, ombro: 0.13, bojo: 0.02,
    cuspides: [{ x: 0, z: 0.5, h: 1.9, r: 0.44 }, { x: 0, z: -0.52, h: 1.35, r: 0.42 }], sulcoCentral: true, raiz: 14, n: 2.4,
  },
  // molar: altura ≈ 0,7 da largura, sem cinta no meio, quatro cúspides e o sulco da face de fora
  molar: {
    altura: 6.9, largura: 10.2, espessura: 11.0, colo: 0.94, alarga: 0.42, convexa: true, borda: 0.84, ponta: 0, cantos: 0, topo: 0.7, ombro: 0.12, bojo: 0.012, sulco: true,
    cuspides: [
      { x: -0.48, z: 0.46, h: 1.35, r: 0.42 }, { x: 0.46, z: 0.46, h: 1.2, r: 0.42 },
      { x: -0.46, z: -0.46, h: 1.25, r: 0.42 }, { x: 0.46, z: -0.46, h: 1.1, r: 0.42 },
    ],
    raiz: 13, n: 2.6,
  },
  // inferiores da frente: estreitos no colo (≈ 3,5 mm) e mais largos na borda (≈ 5,5 mm)
  incisivoInf: { altura: 9.2, largura: 5.5, espessura: 5.8, colo: 0.64, alarga: 1.0, borda: 0.26, ponta: 0, cantos: 0.4, topo: 0.4, ombro: 0.02, cuspides: [], raiz: 12.5, n: 2.4 },
  lateralInf: { altura: 9.6, largura: 6.0, espessura: 6.1, colo: 0.62, alarga: 1.0, borda: 0.26, ponta: 0, cantos: 0.55, topo: 0.4, ombro: 0.02, cuspides: [], raiz: 14, n: 2.4 },
};

export type Ajustes = {
  escalaAltura?: number; // 0.82 = dente curto
  lasca?: number; // profundidade da lasca no canto distal da borda (mm)
  ladoLasca?: 1 | -1;
  raiz?: boolean;
  mesial?: 1 | -1; // para que lado (x local) fica o meio da arcada: a ponta do canino puxa para lá
  segmentos?: number;
  // quantos anéis na lateral da coroa e no topo (26 e 12): poucos = a malha digital, de triângulos grandes
  aneis?: [number, number];
  // cores por vértice: colo, meio e borda
  cores?: [string, string, string];
  // só a metade vestibular (para a faceta): 0 = dente inteiro
  soFrente?: number;
  // recorte vertical: só a faixa da coroa entre v0 e v1 (para as camadas da restauração)
  faixa?: [number, number];
  // tronco: a raiz curta que continua a coroa na mesma malha (molar); vira o grupo 1 (dentina)
  tronco?: number;
  // emergência: a coroa do implante continua para baixo e afina até a largura do pilar (fundo fechado)
  emergencia?: number;
  // sem o sombreado de contato no colo (no corte, o colo fica à vista, sem gengiva em volta)
  semColo?: boolean;
  // o fundo do tronco vira a seção das raízes onde nascem (elas continuam o tronco, sem degrau)
  uniao?: Par;
  // o lado do meio (mesial) estufa no terço da borda, até tocar o vizinho (mm): nos centrais, o contato fica
  // perto da borda, e não logo abaixo da papila
  contato?: number;
};

// As raízes do molar onde nascem: duas superelipses lado a lado (centros em ±xc), juntas no meio por uma
// união suave (sem vinco entre elas). Mais fundo, afinam e se afastam, e a furca abre.
export type Par = { xc: number; a: number; b: number; n: number };
const K_UNIAO = 8;

// maior que 1 dentro da união
function dentroDoPar(p: Par, x: number, z: number) {
  const g = (x0: number) => Math.pow(Math.pow(Math.abs((x - x0) / p.a), p.n) + Math.pow(Math.abs(z / p.b), p.n), 1 / p.n);
  return Math.exp(-K_UNIAO * (g(-p.xc) - 1)) + Math.exp(-K_UNIAO * (g(p.xc) - 1));
}

// a distância do centro até a borda da união, na direção (dx, dz) (o centro tem de estar dentro)
function raioDoPar(p: Par, dx: number, dz: number) {
  let lo = 0;
  let hi = p.xc + p.a + p.b + 2;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (dentroDoPar(p, m * dx, m * dz) > 1) lo = m;
    else hi = m;
  }
  return lo;
}

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const sinal = (x: number) => (x < 0 ? -1 : 1);

// o tronco do molar: 3,2 mm, afinando em linha reta (≈ 14° da vertical) até a largura de fora das raízes
export const TRONCO = 3.2;
export const TRONCO_FIM = 0.83;
// as duas raízes do molar onde nascem (no fim do tronco), em frações da largura: centro e meia largura;
// a espessura em mm; "curva" é quanto cada uma se afasta do meio até o ápice (em u², como no corte).
export const RAIZ_MOLAR = { centro: 0.14, meia: 0.25, espessura: 4.6, curva: 3.0, ponta: -12.6 };
export const perfilRaiz = (u: number) => Math.pow(1 - u, 0.42) * 0.92 + 0.08 * (1 - u);

// As medidas da coroa a cada altura relativa v (0 no colo, 1 no topo): meia largura, meia espessura, quanto a
// seção anda para trás e quanto o topo se recolhe. A malha e o teste de colisão usam as mesmas.
export function medidasDente(f: Forma, aj: Ajustes = {}) {
  const H = f.altura * (aj.escalaAltura ?? 1);
  const alarga = f.alarga ?? 0.55;
  const bojo = f.bojo ?? 0.035;
  const abre = (v: number) => (f.convexa ? Math.sin((Math.PI / 2) * Math.min(1, v / alarga)) : suave(0, alarga, v));
  const meiaLarg = (v: number) => (f.largura / 2) * (f.colo + (1 - f.colo) * abre(v)) * (1 + bojo * Math.sin(Math.PI * v));
  const meiaEsp = (v: number) => (f.espessura / 2) * (1 - (1 - f.borda) * Math.pow(v, 1.35)) * (1 + bojo * 1.4 * Math.sin(Math.PI * v * 0.9));
  const b0 = f.espessura / 2;
  const desloc = (v: number) => (b0 - meiaEsp(v)) * 0.7;
  const recolhe = (v: number) => 1 - f.ombro * Math.pow(suave(0.78, 1, v), 1.5);
  return { H, meiaLarg, meiaEsp, desloc, recolhe };
}

// Quanto um ponto (no espaço do dente) está dentro da coroa: < 1 dentro. Aproximado no topo (sem os cantos).
export function dentroDaCoroa(f: Forma, m: ReturnType<typeof medidasDente>, x: number, y: number, z: number) {
  const v = y / (m.H - f.topo);
  if (v < 0 || v > 1) return Infinity;
  const a = m.meiaLarg(v) * m.recolhe(v);
  const b = m.meiaEsp(v) * m.recolhe(v);
  return Math.pow(Math.abs(x / a), f.n) + Math.pow(Math.abs((z - m.desloc(v)) / b), f.n);
}

export function geometriaDente(f: Forma, aj: Ajustes = {}): THREE.BufferGeometry {
  const N = aj.segmentos ?? 56;
  const { H, meiaLarg, meiaEsp, desloc, recolhe } = medidasDente(f, aj);
  const comRaiz = (aj.raiz ?? false) || !!aj.tronco || !!aj.emergencia;
  const linhasRaiz = comRaiz ? 12 : 0;
  const linhasLado = aj.aneis?.[0] ?? 26;
  const linhasTopo = aj.aneis?.[1] ?? 12;
  const [cColo, cMeio, cBorda] = (aj.cores ?? ["#f1e8d8", "#fdfaf4", "#eaf0f3"]).map((c) => new THREE.Color(c));
  const cRaiz = new THREE.Color("#efe6d3");
  const anterior = f.cuspides.length === 0;

  // altura da borda em cada ângulo: cantos caem, o canino sobe num V (a aresta do lado do meio, mais curta),
  // a lasca tira um canto
  const t0 = (aj.mesial ?? 0) * 0.2;
  // quanto o ponto (cx, na altura v) anda para o lado do meio
  const estufa = (cx: number, v: number) =>
    aj.contato && aj.mesial ? aj.mesial * aj.contato * suave(0.45, 0.85, v) * suave(0.25, 1, cx * aj.mesial) : 0;
  const borda = (cx: number) => {
    let y = H;
    y -= f.cantos * Math.pow(Math.abs(cx), 3);
    if (f.ponta) {
      const alcance = cx > t0 ? 1 - t0 : 1 + t0;
      y += f.ponta * Math.pow(Math.max(0, 1 - Math.abs(cx - t0) / alcance), f.cuspideRedonda ? 0.75 : 1.25);
    }
    if (aj.lasca) {
      const lado = (aj.ladoLasca ?? 1) * cx;
      y -= aj.lasca * suave(0.4, 0.58, lado) * (0.65 + 0.35 * suave(0.58, 1, lado));
    }
    return y;
  };

  const pos: number[] = [];
  const cor: number[] = [];
  const v0 = aj.faixa ? aj.faixa[0] : 0;
  const v1 = aj.faixa ? aj.faixa[1] : 1;

  const direcao = (t: number, n: number) => {
    const c = Math.cos(t);
    const s = Math.sin(t);
    return [sinal(c) * Math.pow(Math.abs(c), 2 / n), sinal(s) * Math.pow(Math.abs(s), 2 / n)];
  };

  const anel = (fn: (cx: number, cz: number, t: number) => [number, number, number, THREE.Color]) => {
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      const [cx, cz] = direcao(t, f.n);
      const [x, y, z, c] = fn(cx, cz, t);
      pos.push(x, y, z);
      cor.push(c.r, c.g, c.b);
    }
  };

  // raiz: do ápice ao colo (ou o tronco, quase reto, com o fundo em cúpula)
  const fundoRaiz = aj.tronco ?? aj.emergencia ?? f.raiz;
  if (comRaiz) {
    for (let k = 0; k < linhasRaiz; k++) {
      const u = k / linhasRaiz;
      const s = aj.emergencia
        ? 0.5 + 0.5 * Math.pow(u, 0.75)
        : aj.tronco
          ? TRONCO_FIM + (1 - TRONCO_FIM) * u
          : 0.12 + 0.88 * Math.pow(u, 0.55);
      anel((cx, cz) => {
        const [dx, dz] = aj.tronco || aj.emergencia ? [cx, cz] : [cx * 0.92, cz * 0.95];
        let x = meiaLarg(0) * s * dx;
        let z = meiaEsp(0) * s * dz;
        if (aj.tronco && aj.uniao) {
          // perto do fundo, a seção do tronco passa a ser a das duas raízes juntas
          const r0 = Math.hypot(x, z) || 1;
          const k = 1 + (raioDoPar(aj.uniao, x / r0, z / r0) / r0 - 1) * (1 - u) * (1 - u);
          x *= k;
          z *= k;
        }
        return [x, -fundoRaiz * (1 - u), desloc(0) + z, cRaiz.clone().lerp(cColo, u * u)];
      });
    }
  }

  // coroa: do colo até o ombro
  for (let k = 0; k <= linhasLado; k++) {
    const v = v0 + (v1 - v0) * (k / linhasLado);
    anel((cx, cz) => {
      const a = meiaLarg(v) * recolhe(v);
      const b = meiaEsp(v) * recolhe(v);
      const yb = v * (H - f.topo);
      const y = yb + (borda(cx) - H) * suave(0.72, 1, v);
      let c = cColo.clone().lerp(cMeio, suave(0.04, 0.45, v));
      c = c.lerp(cBorda, 0.8 * suave(0.7, 1, v) * (1 - f.borda));
      const sombra = aj.semColo ? 1 : 0.88 + 0.12 * suave(0, 0.1, v);
      c.multiplyScalar(sombra * (1 - 0.05 * Math.pow(Math.abs(cx), 6)));
      let zz = desloc(v) + b * cz;
      if (f.palatina && cz < 0) {
        // a face de trás dos incisivos de cima: côncava no meio (as cristas dos lados ficam) e o cíngulo junto
        // ao colo
        const lados = Math.pow(Math.max(0, 1 - cx * cx), 2);
        const fossa = 0.6 * Math.sin(Math.PI * Math.min(1, Math.max(0, (v - 0.26) / 0.64)));
        const cingulo = 0.32 * Math.exp(-Math.pow((v - 0.15) / 0.1, 2));
        zz += (fossa * lados - cingulo * (1 - cx * cx)) * -cz;
      }
      if (anterior && cz > 0) {
        // os dois sulcos rasos dos lobos, na face da frente
        const sulco = Math.exp(-Math.pow(Math.abs(cx) - 0.34, 2) / 0.012) * Math.sin(Math.PI * Math.min(1, v * 1.15));
        zz -= 0.03 * sulco * cz * cz;
      }
      if (f.sulco && cz > 0) {
        // o sulco da face de fora do molar, do topo até o meio da coroa
        const s = Math.exp(-(cx * cx) / 0.006) * suave(0.35, 0.95, v);
        zz -= 0.32 * s * cz;
      }
      return [a * cx + estufa(cx, v), y, zz, c];
    });
  }

  // topo: do ombro ao centro, com a cúpula e as cúspides
  if (!aj.faixa || v1 >= 1) {
    const aT = meiaLarg(1) * recolhe(1);
    const bT = meiaEsp(1) * recolhe(1);
    for (let k = 1; k <= linhasTopo; k++) {
      const r = 1 - k / linhasTopo;
      const rr = Math.max(r, 0.02);
      anel((cx, cz) => {
        const x = aT * rr * cx + estufa(cx, 1) * rr;
        const z = desloc(1) + bT * rr * cz;
        const yBorda = borda(cx) - f.topo;
        // o centro do topo tem uma altura só (a da ponta); a borda de cada ângulo entra aos poucos
        const yCentro = borda(t0) - f.topo;
        let y = yCentro + (yBorda - yCentro) * rr * rr + f.topo * (1 - rr * rr) * (anterior ? 1 : 1.25 - 0.25 * rr * rr);
        const px = rr * cx;
        const pz = rr * cz;
        for (const q of f.cuspides) {
          const d2 = (px - q.x) ** 2 + (pz - q.z) ** 2;
          y += q.h * Math.exp(-d2 / (q.r * q.r)) * (1 - Math.pow(rr, 8));
        }
        if (f.sulcoCentral) {
          // o sulco central do pré-molar, de mesial a distal, entre as duas cúspides
          y -= 0.42 * Math.exp(-((pz + 0.02) * (pz + 0.02)) / 0.006) * (1 - Math.pow(rr, 6));
        }
        if (f.sulco) {
          // os sulcos do topo do molar, em cruz
          y -= 0.5 * (Math.exp(-(px * px) / 0.008) + Math.exp(-(pz * pz) / 0.008)) * (1 - Math.pow(rr, 6));
        }
        let c = cMeio.clone().lerp(cBorda, 0.8 * (1 - f.borda));
        if (f.cuspides.length) c = new THREE.Color("#f8f3e8").lerp(new THREE.Color("#e8d9bd"), Math.exp(-(px * px + pz * pz * 0.2) / 0.02) * 0.45);
        return [x, y, z, c];
      });
    }
  }

  const aneis = pos.length / 3 / N;
  const idx: number[] = [];
  for (let k = 0; k < aneis - 1; k++) {
    for (let i = 0; i < N; i++) {
      const a = k * N + i;
      const b = k * N + ((i + 1) % N);
      const c = (k + 1) * N + i;
      const d = (k + 1) * N + ((i + 1) % N);
      idx.push(a, c, b, b, c, d);
    }
  }

  // tampa no ápice da raiz (o tronco fica aberto: as raízes o fecham, e uma tampa dividiria os vértices
  // com a última faixa, tombando as normais para baixo, numa linha escura)
  const nRaiz = linhasRaiz * N * 6;
  if (comRaiz && !aj.tronco) {
    const p = pos.length / 3;
    pos.push(0, -fundoRaiz - (aj.tronco ? 0.2 : aj.emergencia ? 0 : 0.6), desloc(0));
    cor.push(cRaiz.r, cRaiz.g, cRaiz.b);
    for (let i = 0; i < N; i++) idx.push(p, i, (i + 1) % N);
  }

  // só a frente: descarta os triângulos da metade lingual (para a lâmina da faceta)
  let indices = idx;
  if (aj.soFrente) {
    const limite = aj.soFrente;
    indices = [];
    for (let t = 0; t < idx.length; t += 3) {
      const zs = [idx[t], idx[t + 1], idx[t + 2]].map((j) => pos[j * 3 + 2]);
      if (Math.min(...zs) >= limite) indices.push(idx[t], idx[t + 1], idx[t + 2]);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  if (aj.tronco && !aj.soFrente) {
    // grupo 0 = coroa (esmalte), grupo 1 = tronco (dentina)
    g.addGroup(0, nRaiz, 1);
    g.addGroup(nRaiz, indices.length - nRaiz, 0);
  }
  return g;
}

// Uma casca por fora da superfície (película, alinhador fino): cada vértice anda ao longo da normal.
export function inflar(g: THREE.BufferGeometry, d: number) {
  const out = g.clone();
  const p = out.attributes.position as THREE.BufferAttribute;
  const n = out.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * d, p.getY(i) + n.getY(i) * d, p.getZ(i) + n.getZ(i) * d);
  p.needsUpdate = true;
  out.computeVertexNormals();
  return out;
}

// as duas raízes do molar a uma profundidade d abaixo do tronco
function raizesDoMolar(d: number): Par {
  const f = FORMAS.molar;
  const R = RAIZ_MOLAR;
  const u = Math.min(1, Math.max(0, d / (-R.ponta - TRONCO)));
  const s = perfilRaiz(u);
  return { xc: R.centro * f.largura + R.curva * u * u, a: R.meia * f.largura * s, b: R.espessura * s, n: f.n };
}

function malha(pos: number[], cor: number[], idx: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// anéis empilhados para baixo (a ordem dos vértices de cada anel é anti-horária vista de cima): faces para fora
function costura(idx: number[], aneis: number, n: number, inicio = 0) {
  for (let k = 0; k < aneis - 1; k++)
    for (let i = 0; i < n; i++) {
      const a = inicio + k * n + i;
      const b = inicio + k * n + ((i + 1) % n);
      const c = inicio + (k + 1) * n + i;
      const d = inicio + (k + 1) * n + ((i + 1) % n);
      idx.push(a, b, c, b, d, c);
    }
}

// onde duas partes se encontram, os vértices repetidos recebem a mesma normal (sem linha na emenda)
function soldaNormais(g: THREE.BufferGeometry) {
  const p = g.attributes.position as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  const juntos = new Map<string, number[]>();
  for (let i = 0; i < p.count; i++) {
    const k = `${Math.round(p.getX(i) * 1e4)},${Math.round(p.getY(i) * 1e4)},${Math.round(p.getZ(i) * 1e4)}`;
    const lista = juntos.get(k);
    if (lista) lista.push(i);
    else juntos.set(k, [i]);
  }
  const v = new THREE.Vector3();
  for (const lista of juntos.values()) {
    if (lista.length < 2) continue;
    v.set(0, 0, 0);
    for (const i of lista) v.add(new THREE.Vector3(n.getX(i), n.getY(i), n.getZ(i)));
    v.normalize();
    for (const i of lista) n.setXYZ(i, v.x, v.y, v.z);
  }
  n.needsUpdate = true;
}

// Molar inteiro, numa peça só de superfície contínua: a coroa (esmalte, grupo 0) e, em dentina (grupo 1),
// o tronco que continua a coroa, as raízes ainda juntas (a seção é a união suave das duas, com o sulco do
// meio aprofundando) e, a partir da furca, as duas raízes separadas até o ápice.
export function geometriaMolar(aj: Ajustes = {}) {
  const f = FORMAS.molar;
  const N = aj.segmentos ?? 56;
  const L = -RAIZ_MOLAR.ponta - TRONCO;
  const cRaiz = new THREE.Color("#efe6d3");
  const cPonta = new THREE.Color("#e6dcc6");

  // A) coroa e tronco (aberto embaixo); o anel de baixo do tronco já é a seção das raízes onde nascem
  const coroa = geometriaDente(f, { ...aj, tronco: TRONCO, uniao: raizesDoMolar(0) });
  const grupos = coroa.groups.map((g) => ({ ...g }));
  coroa.clearGroups();
  const pa = coroa.attributes.position as THREE.BufferAttribute;
  const dirs = Array.from({ length: N }, (_, i) => {
    const r = Math.hypot(pa.getX(i), pa.getZ(i)) || 1;
    return [pa.getX(i) / r, pa.getZ(i) / r] as const;
  });

  // B) as raízes juntas, até o meio ficar com 30% da espessura (a furca)
  let dFurca = 0;
  for (; dFurca < L * 0.8; dFurca += 0.05) {
    const p = raizesDoMolar(dFurca + 0.05);
    if (dentroDoPar(p, 0, 0) < 1.05 || raioDoPar(p, 0, 1) < 0.3 * p.b) break;
  }
  const J = Math.max(2, Math.round(dFurca / 0.3));
  const posB: number[] = [];
  const corB: number[] = [];
  for (let j = 0; j <= J; j++) {
    const d = (dFurca * j) / J;
    const p = raizesDoMolar(d);
    for (const [dx, dz] of dirs) {
      const r = raioDoPar(p, dx, dz);
      posB.push(dx * r, -TRONCO - d, dz * r);
      corB.push(cRaiz.r, cRaiz.g, cRaiz.b);
    }
  }
  const idxB: number[] = [];
  costura(idxB, J + 1, N);
  const juntas = malha(posB, corB, idxB);

  // C) as duas raízes: o anel de cima é a metade da furca do lado de cada uma, fechada no meio por um
  // segmento reto (onde as duas se tocam); daí para baixo, cada anel vai virando a seção da própria raiz
  const q = N / 4;
  const base = J * N;
  const raizes = ([-1, 1] as const).map((lado) => {
    const ordem = lado > 0 ? [...Array.from({ length: q }, (_, i) => 3 * q + i), ...Array.from({ length: q + 1 }, (_, i) => i)] : Array.from({ length: 2 * q + 1 }, (_, i) => q + i);
    const topo: [number, number][] = ordem.map((i) => [posB[(base + i) * 3], posB[(base + i) * 3 + 2]]);
    const zA = topo[topo.length - 1][1];
    const zB = topo[0][1];
    const M = 6;
    for (let m = 1; m <= M; m++) topo.push([0, zA + ((zB - zA) * m) / (M + 1)]);
    const H = topo.length;
    const p0 = raizesDoMolar(dFurca);
    const angulos = topo.map(([x, z]) => Math.atan2(z, x - lado * p0.xc));
    const pos: number[] = [];
    const cor: number[] = [];
    const K = 16;
    // o corpo da raiz vai até onde ela ainda tem ~1,5 mm de largura; dali, o ápice fecha em arco (redondo)
    const dCorpo = L * 0.93;
    const anel = (d: number, p: Par, encolhe: number, desce: number) => {
      const w = suave(0, 1.6, d - dFurca);
      const c = cRaiz.clone().lerp(cPonta, Math.min(1, d / L));
      topo.forEach(([x, z], h) => {
        const fi = angulos[h];
        const cf = Math.cos(fi);
        const sf = Math.sin(fi);
        const r = Math.pow(Math.pow(Math.abs(cf / p.a), p.n) + Math.pow(Math.abs(sf / p.b), p.n), -1 / p.n) * encolhe;
        pos.push(x + (lado * p.xc + r * cf - x) * w, -TRONCO - d - desce, z + (r * sf - z) * w);
        cor.push(c.r, c.g, c.b);
      });
    };
    for (let k = 0; k <= K; k++) {
      const d = dFurca + (dCorpo - dFurca) * Math.pow(k / K, 1.25);
      anel(d, raizesDoMolar(d), 1, 0);
    }
    const pFim = raizesDoMolar(dCorpo);
    const raioPonta = Math.min(pFim.a, pFim.b) * 0.9;
    const A = 4;
    for (let m = 1; m <= A; m++) {
      const th = ((Math.PI / 2) * m) / (A + 1);
      anel(dCorpo, pFim, Math.cos(th), raioPonta * Math.sin(th));
    }
    const idx: number[] = [];
    costura(idx, K + 1 + A, H);
    const ultimoAnel = K + A;
    // o ápice, no fim do arco
    const ponta = pos.length / 3;
    pos.push(lado * pFim.xc, -TRONCO - dCorpo - raioPonta, 0);
    cor.push(cPonta.r, cPonta.g, cPonta.b);
    for (let h = 0; h < H; h++) idx.push(ultimoAnel * H + h, ultimoAnel * H + ((h + 1) % H), ponta);
    return malha(pos, cor, idx);
  });

  const g = mergeGeometries([coroa, juntas, ...raizes], false)!;
  soldaNormais(g);
  // material 0 = esmalte (coroa), 1 = dentina (tronco e raízes)
  grupos.forEach((gr) => g.addGroup(gr.start, gr.count, gr.materialIndex ?? 0));
  const inicio = coroa.index!.count;
  g.addGroup(inicio, g.index!.count - inicio, 1);
  return g;
}
