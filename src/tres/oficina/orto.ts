import * as THREE from "three";
import { arcada, type Vaga } from "../arcada";
import { dentroDaCoroa, geometriaDente, medidasDente } from "../dente";
import { geometriaGengiva } from "../gengiva";

// T1 · Ortodontia: a arcada de cima de pré-molar a pré-molar, montada de coroa para cima (a cena vira o grupo).
// Os dentes de hoje (tortos) e os do plano (alinhados) são os mesmos, em poses diferentes; a gengiva
// acompanha (duas formas, misturadas na cena); cada alinhador é uma peça só, um perfil em U que corre pela
// curva e abraça os dentes na pose da etapa dele, sem paredes entre os dentes.

export type Pose = { dt?: number; dn?: number; dy?: number; giro?: number; torque?: number; tip?: number };

// hoje: giros de 20 a 30°, um canino 2,6 mm para fora e mais alto; dt para trás (distal), dn para fora,
// dy para dentro da gengiva (negativo), giro em torno do eixo do dente, torque e tip em radianos
export const TORTO_ORTO: Record<string, Pose> = {
  "1:0": { giro: 0.4, dn: 0.7, tip: 0.04 },
  "-1:0": { giro: 0.22, dn: -0.6, dy: -0.3 },
  "1:1": { giro: -0.5, dn: -1.6, dy: -0.5, tip: -0.06 },
  "-1:1": { giro: 0.38, dn: -0.6, tip: 0.05 },
  "1:2": { dn: 2.6, dy: -1.3, giro: 0.16, tip: 0.1, torque: 0.12 },
  "-1:2": { giro: -0.14, dn: 0.4 },
  "1:3": { giro: 0.26, dn: -0.9, dt: -0.35 },
  "-1:3": { giro: -0.26, dn: -0.5 },
  "1:4": { giro: 0.1, dt: 0.2 },
  "-1:4": { giro: 0.14, dn: -0.4, dt: 0.3 },
};

// as etapas: cada alinhador leva os dentes até a pose dele
export const ETAPAS_ORTO = [1 / 3, 2 / 3, 1];

export const vagasOrto = () => arcada(false, 5, 0.1, 1);
const chave = (v: Vaga) => `${v.lado}:${v.ordem}`;
const escalaOrto = (v: Vaga) => 1 + ((((v.ordem * 3 + (v.lado > 0 ? 1 : 0)) * 37) % 7) - 3) / 100;
export const ajustesOrto = (v: Vaga) => ({
  mesial: (v.lado === 1 ? -1 : 1) as 1 | -1,
  escalaAltura: escalaOrto(v),
  cores: ["#efe5d3", "#fbf7ee", "#dfe7ec"] as [string, string, string],
});

// a pose de um dente no instante t do tratamento (0 = hoje, 1 = o planejado)
export function poseOrto(v: Vaga, t: number) {
  const p = TORTO_ORTO[chave(v)] ?? {};
  const k = 1 - t;
  const pos = v.pos
    .clone()
    .addScaledVector(v.tangente, (p.dt ?? 0) * k)
    .addScaledVector(v.normal, (p.dn ?? 0) * k);
  pos.y += (p.dy ?? 0) * k;
  const rot = new THREE.Euler((p.torque ?? 0) * k, v.giro + (p.giro ?? 0) * k, (p.tip ?? 0) * k, "YXZ");
  return { pos, rot };
}

export function matrizOrto(v: Vaga, t: number) {
  const { pos, rot } = poseOrto(v, t);
  return new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(rot), new THREE.Vector3(1, 1, 1));
}

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------- o alinhador
type P2 = [number, number];

// casco convexo (cadeia monótona)
function casco(pts: P2[]): P2[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cruz = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const baixo: P2[] = [];
  for (const q of p) {
    while (baixo.length >= 2 && cruz(baixo[baixo.length - 2], baixo[baixo.length - 1], q) <= 0) baixo.pop();
    baixo.push(q);
  }
  const cima: P2[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (cima.length >= 2 && cruz(cima[cima.length - 2], cima[cima.length - 1], q) <= 0) cima.pop();
    cima.push(q);
  }
  return [...baixo.slice(0, -1), ...cima.slice(0, -1)];
}

// só a parte do polígono convexo com y >= y0
function cortaEmbaixo(pol: P2[], y0: number): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < pol.length; i++) {
    const a = pol[i];
    const b = pol[(i + 1) % pol.length];
    const ina = a[1] >= y0;
    const inb = b[1] >= y0;
    if (ina) out.push(a);
    if (ina !== inb) {
      const f = (y0 - a[1]) / (b[1] - a[1]);
      out.push([a[0] + (b[0] - a[0]) * f, y0]);
    }
  }
  return out;
}

// onde a reta horizontal y = y0 corta o polígono convexo: [menor s, maior s]
function faixaEm(pol: P2[], y0: number): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < pol.length; i++) {
    const a = pol[i];
    const b = pol[(i + 1) % pol.length];
    if (Math.abs(a[1] - y0) < 1e-6) {
      lo = Math.min(lo, a[0]);
      hi = Math.max(hi, a[0]);
    }
    if ((a[1] - y0) * (b[1] - y0) < 0) {
      const s = a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]);
      lo = Math.min(lo, s);
      hi = Math.max(hi, s);
    }
  }
  return [lo, hi];
}

// do ponto o (na borda de baixo), até onde o raio na direção d chega dentro do polígono convexo
function alcance(pol: P2[], o: P2, d: P2) {
  let melhor = 0;
  for (let i = 0; i < pol.length; i++) {
    const a = pol[i];
    const b = pol[(i + 1) % pol.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const den = d[0] * ey - d[1] * ex;
    if (Math.abs(den) < 1e-9) continue;
    const ax = a[0] - o[0];
    const ay = a[1] - o[1];
    const t = (ax * ey - ay * ex) / den;
    const s = (ax * d[1] - ay * d[0]) / den;
    if (s >= -1e-6 && s <= 1 + 1e-6 && t > melhor) melhor = t;
  }
  return melhor;
}

export type OpcoesAlinhador = { folga?: number; espessura?: number; amostras?: number; raios?: number };

// o alinhador da etapa t: as seções dos dentes (na pose da etapa) por planos ao longo da curva da arcada
// alinhada, o casco de cada seção acima da gengiva, um "fechamento" ao longo da curva (passa por cima dos
// vãos entre os dentes) e a parede com espessura
export function geometriaAlinhador(vagas: Vaga[], t: number, op: OpcoesAlinhador = {}) {
  const folga = op.folga ?? 0.12;
  const esp = op.espessura ?? 0.7;
  const S = op.amostras ?? 240;
  const J = op.raios ?? 26;

  // os anéis da coroa de cada dente, já na pose da etapa
  const NS = 40;
  const dentes = vagas.map((v) => {
    const g = geometriaDente(v.forma, { ...ajustesOrto(v), segmentos: NS });
    g.applyMatrix4(matrizOrto(v, t));
    const p = g.attributes.position.array as Float32Array;
    const aneis: Float32Array[] = [];
    for (let k = 0; k + NS <= p.length / 3; k += NS) aneis.push(p.subarray(k * 3, (k + NS) * 3));
    return { v, aneis, centro: poseOrto(v, t).pos };
  });

  // a curva: pelos centros da arcada alinhada, da esquerda para a direita, passando um pouco do último dente
  const fila = [...vagas].sort((a, b) => a.lado * (a.ordem + 0.5) - b.lado * (b.ordem + 0.5));
  const pts = fila.map((v) => v.pos.clone());
  const ponta = (a: THREE.Vector3, b: THREE.Vector3, w: number) => a.clone().add(a.clone().sub(b).setLength(w));
  const curva = new THREE.CatmullRomCurve3(
    [ponta(pts[0], pts[1], fila[0].forma.largura / 2 + 0.7), ...pts, ponta(pts[pts.length - 1], pts[pts.length - 2], fila[fila.length - 1].forma.largura / 2 + 0.7)],
    false,
    "centripetal",
  );

  type Amostra = { P: THREE.Vector3; T: THREE.Vector3; N: THREE.Vector3; pol: P2[] | null; yCorte: number; sMeio: number };
  const amostras: Amostra[] = [];
  for (let i = 0; i <= S; i++) {
    const u = i / S;
    const P = curva.getPointAt(u);
    P.y = 0;
    const T = curva.getTangentAt(u).setY(0).normalize();
    const N = new THREE.Vector3(T.z, 0, -T.x);
    if (N.dot(new THREE.Vector3(P.x, 0, P.z + 20)) < 0) N.negate();
    // a linha da gengiva (onde o alinhador termina): mais alta entre os dentes
    let dist = Infinity;
    let larg = 8;
    for (const d of dentes) {
      const q = Math.hypot(d.centro.x - P.x, d.centro.z - P.z);
      if (q < dist) {
        dist = q;
        larg = d.v.forma.largura;
      }
    }
    const rel = dist / (larg / 2);
    const arco = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, (rel - 0.32) / 0.72)));
    const yCorte = 0.4 + 0.75 * arco;
    // a seção dos dentes perto deste plano
    const sec: P2[] = [];
    for (const d of dentes) {
      if (Math.hypot(d.centro.x - P.x, d.centro.z - P.z) > d.v.forma.largura / 2 + 4) continue;
      for (const anel of d.aneis) {
        const n = anel.length / 3;
        for (let k = 0; k < n; k++) {
          const j = (k + 1) % n;
          const ax = anel[k * 3] - P.x;
          const ay = anel[k * 3 + 1];
          const az = anel[k * 3 + 2] - P.z;
          const bx = anel[j * 3] - P.x;
          const by = anel[j * 3 + 1];
          const bz = anel[j * 3 + 2] - P.z;
          const da = ax * T.x + az * T.z;
          const db = bx * T.x + bz * T.z;
          if (da <= 0 === db <= 0) continue;
          const f = da / (da - db);
          const x = ax + (bx - ax) * f;
          const y = ay + (by - ay) * f;
          const z = az + (bz - az) * f;
          sec.push([x * N.x + z * N.z, y]);
        }
      }
    }
    let pol: P2[] | null = null;
    let sMeio = 0;
    if (sec.length >= 3) {
      const c = cortaEmbaixo(casco(sec), yCorte);
      if (c.length >= 3) {
        const [lo, hi] = faixaEm(c, yCorte);
        if (hi - lo > 0.4) {
          pol = c;
          sMeio = (lo + hi) / 2;
        }
      }
    }
    amostras.push({ P, T, N, pol, yCorte, sMeio });
  }

  // o meio de cada seção, alisado ao longo da curva (as amostras sem seção copiam as vizinhas)
  const validos = amostras.map((a, i) => (a.pol ? i : -1)).filter((i) => i >= 0);
  const vizinha = (i: number) => validos.reduce((m, k) => (Math.abs(k - i) < Math.abs(m - i) ? k : m), validos[0]);
  amostras.forEach((a, i) => {
    if (!a.pol) {
      const k = vizinha(i);
      a.pol = amostras[k].pol;
      a.sMeio = amostras[k].sMeio;
      a.yCorte = Math.max(a.yCorte, amostras[k].yCorte);
    }
  });
  const meio = amostras.map((_, i) => {
    let s = 0;
    let n = 0;
    for (let k = Math.max(0, i - 8); k <= Math.min(S, i + 8); k++) {
      s += amostras[k].sMeio;
      n++;
    }
    return s / n;
  });

  // os raios de cada seção (do meio da base, de 0 = para fora a 180° = para dentro, por cima)
  const dir = Array.from({ length: J + 1 }, (_, j) => [Math.cos((Math.PI * j) / J), Math.sin((Math.PI * j) / J)] as P2);
  const origens = amostras.map((a, i) => {
    const [lo, hi] = faixaEm(a.pol!, a.yCorte);
    return [Math.min(Math.max(meio[i], lo + 0.15), hi - 0.15), a.yCorte] as P2;
  });
  const raios = amostras.map((a, i) => dir.map((d) => alcance(a.pol!, origens[i], d)));
  // fechamento ao longo da curva (dilata e depois encolhe, ±2 mm): passa por cima dos vãos e das dobras em
  // volta de um dente fora do lugar, num volume só, sem entrar nos dentes
  const W = 6;
  const dil = raios.map((_, i) => dir.map((_, j) => Math.max(...raios.slice(Math.max(0, i - W), i + W + 1).map((r) => r[j]))));
  const fech = dil.map((_, i) => dir.map((_, j) => Math.min(...dil.slice(Math.max(0, i - W), i + W + 1).map((r) => r[j]))));
  const liso = fech.map((_, i) =>
    dir.map((_, j) => {
      let s = 0;
      let n = 0;
      for (let k = Math.max(0, i - 4); k <= Math.min(S, i + 4); k++) {
        s += fech[k][j];
        n++;
      }
      return Math.max(raios[i][j], s / n);
    }),
  );
  // o perfil fechado de cada amostra: por fora (da borda de fora, por cima, até a borda de dentro), a volta
  // da borda de dentro, por dentro de volta, e a volta da borda de fora
  const pos: number[] = [];
  // a altura de cada ponto acima da borda do alinhador (a cena apaga o último milímetro: a borda some na
  // gengiva em vez de virar um traço)
  const borda: number[] = [];
  let Q = 0;
  amostras.forEach((a, i) => {
    const o = origens[i];
    const dentro = dir.map((d, j) => [o[0] + d[0] * (liso[i][j] + folga), o[1] + d[1] * (liso[i][j] + folga)] as P2);
    dentro[0][1] = o[1];
    dentro[J][1] = o[1];
    const normal = dentro.map((p, j) => {
      const a0 = dentro[Math.max(0, j - 1)];
      const a1 = dentro[Math.min(J, j + 1)];
      let nx = a1[1] - a0[1];
      let ny = -(a1[0] - a0[0]);
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      if (nx * (p[0] - o[0]) + ny * (p[1] - o[1]) < 0) {
        nx = -nx;
        ny = -ny;
      }
      return [nx, ny] as P2;
    });
    const fora = dentro.map((p, j) => [p[0] + normal[j][0] * esp, p[1] + normal[j][1] * esp] as P2);
    fora[0][1] = Math.max(fora[0][1], o[1] + 0.05);
    fora[J][1] = Math.max(fora[J][1], o[1] + 0.05);
    const volta = (de: P2, ate: P2): P2[] => {
      // meia volta arredondada para baixo, entre a parede de fora e a de dentro
      const cx = (de[0] + ate[0]) / 2;
      const cy = (de[1] + ate[1]) / 2;
      const r = Math.hypot(ate[0] - de[0], ate[1] - de[1]) / 2;
      const a0 = Math.atan2(de[1] - cy, de[0] - cx);
      const lado = Math.sign(ate[0] - de[0]) || 1;
      return [1, 2, 3].map((m) => {
        const ang = a0 + lado * (Math.PI * m) / 4;
        return [cx + r * Math.cos(ang), cy + r * Math.sin(ang) - 0.12 * Math.sin((Math.PI * m) / 4)] as P2;
      });
    };
    // só a parede de fora (as linhas das paredes de dentro e das bordas pareciam plástico amassado)
    void volta;
    const anel: P2[] = fora;
    Q = anel.length;
    for (const [s, y] of anel) {
      pos.push(a.P.x + a.N.x * s, y, a.P.z + a.N.z * s);
      borda.push(y - o[1]);
    }
  });

  // uma folha aberta (o perfil não fecha), com as faces para fora
  const idx: number[] = [];
  for (let i = 0; i < S; i++)
    for (let j = 0; j < Q - 1; j++) {
      const a = i * Q + j;
      const b = i * Q + j + 1;
      const c = (i + 1) * Q + j;
      const d = (i + 1) * Q + j + 1;
      idx.push(a, c, b, b, c, d);
    }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aBorda", new THREE.Float32BufferAttribute(borda, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- a linha de areia (onde as bordas chegam)
export function pontasDasBordas(vagas: Vaga[]) {
  // em cada dente alinhado, o meio da borda (ou a ponta da cúspide de fora), um pouco à frente da face
  return vagas.map((v) => {
    const g = geometriaDente(v.forma, { ...ajustesOrto(v), segmentos: 40 });
    const p = g.attributes.position as THREE.BufferAttribute;
    let yMax = -Infinity;
    for (let i = 0; i < p.count; i++) if (p.getZ(i) > -0.5) yMax = Math.max(yMax, p.getY(i));
    const q = new THREE.Vector3();
    let n = 0;
    let zMax = -Infinity;
    for (let i = 0; i < p.count; i++)
      if (p.getY(i) > yMax - 0.25 && p.getZ(i) > -0.5) {
        q.x += p.getX(i);
        q.y += p.getY(i);
        n++;
        zMax = Math.max(zMax, p.getZ(i));
      }
    q.multiplyScalar(1 / n);
    q.z = zMax + 0.5;
    return { v, ponto: q.applyMatrix4(matrizOrto(v, 1)) };
  });
}

function linhaDeAreia(vagas: Vaga[]) {
  const pontos = pontasDasBordas(vagas).sort((a, b) => a.v.lado * (a.v.ordem + 0.5) - b.v.lado * (b.v.ordem + 0.5));
  const meioI = pontos.findIndex((p) => p.v.lado === 1 && p.v.ordem === 0);
  const meio = pontos[meioI - 1].ponto.clone().add(pontos[meioI].ponto).multiplyScalar(0.5);
  // do meio para cada lado (a cena desenha as duas metades ao mesmo tempo, do meio para fora): só os pontos
  const metade = (ps: THREE.Vector3[]) => new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3([meio, ...ps], false, "centripetal").getPoints(90));
  return [metade(pontos.slice(meioI).map((p) => p.ponto)), metade(pontos.slice(0, meioI).reverse().map((p) => p.ponto))];
}

// ---------------------------------------------------------------- todas as formas da cena
export function formasOrto() {
  const vagas = vagasOrto();
  const opG = { margem: 0.9, papila: 2.6, sobra: 6, porParametro: true };
  return {
    dentes: vagas.map((v) => geometriaDente(v.forma, { ...ajustesOrto(v), tronco: 2.4 })),
    // a gengiva de hoje estufa em volta dos dentes fora do lugar (65% do deslocamento: o colo não aparece)
    gengivaTorta: geometriaGengiva(vagas, { ...opG, fora: (v) => 0.65 * (TORTO_ORTO[chave(v)]?.dn ?? 0) }),
    gengivaCerta: geometriaGengiva(vagas, opG),
    alinhadores: ETAPAS_ORTO.map((t) => geometriaAlinhador(vagas, t)),
    linha: linhaDeAreia(vagas),
  };
}

// ---------------------------------------------------------------- conferência (só no laboratório)
// a maior penetração entre dentes vizinhos (mm), em cada instante pedido
export function colisoesOrto(instantes = [0, 1 / 6, 1 / 3, 1 / 2, 2 / 3, 5 / 6, 1]) {
  const vagas = vagasOrto();
  const fila = [...vagas].sort((a, b) => a.lado * (a.ordem + 0.5) - b.lado * (b.ordem + 0.5));
  const geos = new Map(vagas.map((v) => [v, geometriaDente(v.forma, { ...ajustesOrto(v), segmentos: 40 })]));
  const saida: string[] = [];
  for (const t of instantes) {
    const linha: string[] = [];
    for (let i = 0; i < fila.length - 1; i++) {
      const A = fila[i];
      const B = fila[i + 1];
      let pior = 0;
      for (const [X, Y] of [
        [A, B],
        [B, A],
      ]) {
        const mX = matrizOrto(X, t);
        const invY = matrizOrto(Y, t).invert();
        const medY = medidasDente(Y.forma, ajustesOrto(Y));
        const p = geos.get(X)!.attributes.position as THREE.BufferAttribute;
        const q = new THREE.Vector3();
        for (let k = 0; k < p.count; k++) {
          q.fromBufferAttribute(p, k).applyMatrix4(mX);
          if (q.y < 0.3) continue; // dentro da gengiva não conta
          q.applyMatrix4(invY);
          const val = dentroDaCoroa(Y.forma, medY, q.x, q.y, q.z);
          if (val < 1) pior = Math.max(pior, (1 - Math.pow(val, 1 / Y.forma.n)) * 2);
        }
      }
      linha.push(`${A.lado}:${A.ordem}|${B.lado}:${B.ordem} ${pior.toFixed(2)}`);
    }
    saida.push(`t=${t.toFixed(2)}  ${linha.join("  ")}`);
  }
  return saida;
}

export const suaveOrto = suave;
