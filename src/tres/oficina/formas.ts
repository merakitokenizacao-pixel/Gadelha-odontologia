import * as THREE from "three";
import { arcada } from "../arcada";
import { FORMAS, geometriaDente, geometriaMolar, inflar } from "../dente";
import { geometriaGengiva } from "../gengiva";
import { COR_GENGIVA } from "../materiais";
import { geometriaBloco, geometriaImplante, geometriaPilar } from "../pecas";
import { formasEstetica } from "./estetica";
import { formasOrto } from "./orto";
import { formasEscaneamento, formasSimulacao } from "./tecnologia";

// As formas de cada cena, sem React: o worker (oficina.worker.ts) chama estas funções fora da linha
// principal e devolve os vértices; a cena só monta as malhas. As constantes do implante ficam aqui porque
// o corte (crista, raízes) também precisa delas.

export type Formas = Record<string, THREE.BufferGeometry | THREE.BufferGeometry[]>;

// ---------------------------------------------------------------- implante
export const IMPLANTE = {
  VIZINHO: 10.7, // do centro do vão ao centro de cada molar vizinho
  TOPO: -2.5, // a plataforma fica na altura do osso
  COMP: 10, // comprimento do implante
  FUNDO: -18,
};

const suaveT = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// a crista da gengiva: perto de cada molar, a margem baixa no meio do dente e as papilas cheias e
// redondas nas bordas; no vão, a crista cicatrizada, côncava e lisa
export function topoGengivaImplante(x: number) {
  const { VIZINHO } = IMPLANTE;
  const ax = Math.abs(x);
  const d = Math.abs(ax - VIZINHO);
  const papila = 1.45 * Math.exp(-((d - 4.3) ** 2) / 2.2);
  const margem = 0.55 + papila;
  const vaoLargura = VIZINHO - 5.6;
  const crista = -0.95 + 0.4 * Math.pow(Math.min(1, ax / vaoLargura), 2);
  const k = suaveT(vaoLargura - 1.4, vaoLargura + 0.8, ax);
  return crista + (margem - crista) * k;
}
export const topoOssoImplante = (x: number) => topoGengivaImplante(x) - 2.6;

function formasImplante(): Formas {
  const { VIZINHO, COMP, FUNDO } = IMPLANTE;
  const corG = (_x: number, y: number) => new THREE.Color(COR_GENGIVA.fundo).lerp(new THREE.Color(COR_GENGIVA.crista), Math.min(1, Math.max(0, (y + 7) / 8)));
  const relevo = (x: number, y: number) => {
    // as raízes de cada vizinho levantam a gengiva por fora; some perto da crista
    let r = 0;
    for (const cx of [-VIZINHO, VIZINHO]) for (const dx of [-2.45, 2.45]) r += 0.5 * Math.exp(-((x - cx - dx) ** 2) / 3.4);
    return r * Math.min(1, Math.max(0, (-y - 1.2) / 4));
  };
  return {
    // a gengiva é só a capa de cima; nas laterais e no fundo do trecho cortado fica o osso
    gengiva: geometriaBloco({ x0: -22, x1: 22, fundo: -7.5, topo: topoGengivaImplante, meia: 6.4, raio: 3.0, pontas: 0.6, cor: corG, relevo }),
    osso: geometriaBloco({ x0: -22, x1: 22, fundo: FUNDO + 0.6, topo: topoOssoImplante, meia: 5.6, raio: 1.6, pontas: 0.6, cor: () => new THREE.Color("#efe5cf") }),
    dente: geometriaMolar({ semColo: true }),
    fantasma: geometriaMolar({ segmentos: 40, semColo: true }),
    coroa: geometriaDente(FORMAS.molar, { emergencia: 1.9 }),
    // só as coroas fazem sombra na parede (as raízes estão dentro do osso)
    coroaSombra: geometriaDente(FORMAS.molar, { segmentos: 32 }),
    implante: geometriaImplante(COMP, 2.2, 1.75).corpo,
    pilar: geometriaPilar(5.4, 2.1, 1.45),
  };
}

// ---------------------------------------------------------------- profilaxia
export const filaProfilaxia = () => [...arcada(true, 3, 0.25)].sort((a, b) => a.pos.x - b.pos.x);

function crostaGeo(semente: number) {
  // uma crosta irregular: icosaedro amassado por ruído, com manchas de giz (amarelo-acastanhado)
  const g = new THREE.IcosahedronGeometry(1, 3);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 5.1 + semente) * Math.cos(v.y * 4.3 - semente * 0.7) * Math.sin(v.z * 6.7 + semente * 1.3);
    v.multiplyScalar(1 + 0.07 * n + 0.025 * Math.sin(semente + i));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const cores: number[] = [];
  // giz bege, meio tom mais quente (puxava para o oliva)
  const base = new THREE.Color("#d4c197");
  const claro = new THREE.Color("#e2d3b1");
  const escuro = new THREE.Color("#bea474");
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const r = Math.sin(v.x * 23.1 + semente) * Math.sin(v.y * 19.7) * Math.sin(v.z * 27.3 + semente * 2);
    const c = base.clone().lerp(r > 0.35 ? claro : escuro, Math.min(1, Math.abs(r) * 1.2));
    cores.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(cores, 3));
  return g;
}

function formasProfilaxia(): Formas {
  const fila = filaProfilaxia();
  const vagas = arcada(true, 3, 0.25);
  const escala = (i: number) => 1 + ((i * 37) % 7 - 3) / 100;
  // borda dos incisivos mais translúcida (azulada); variação de ±3% de um dente para outro
  const dentes = fila.map((v, i) =>
    geometriaDente(v.forma, { raiz: false, mesial: v.lado === 1 ? -1 : 1, cores: ["#f0e7d6", "#fcf8f0", "#dde5ea"], escalaAltura: escala(i) }),
  );
  // a película da placa: uma casca de 0,12 mm por fora do esmalte, no terço junto à gengiva
  const placa = fila.map((v, i) => inflar(geometriaDente(v.forma, { faixa: [0, 0.42], mesial: v.lado === 1 ? -1 : 1, escalaAltura: escala(i) }), 0.12));
  const crostas = [0, 1, 2, 3].map((k) => crostaGeo(k * 1.7 + 0.4));
  // a ponta do ultrassom: um tubo fino e curvo; a taça de polimento: um copinho de borracha
  const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.4, 4.5, 2.2), new THREE.Vector3(2.4, 13, 9));
  const taca = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.001, 0),
      new THREE.Vector2(1.4, 0.05),
      new THREE.Vector2(1.9, 0.6),
      new THREE.Vector2(2.05, 2.0),
      new THREE.Vector2(1.6, 2.8),
      new THREE.Vector2(0.9, 3.2),
      new THREE.Vector2(0.8, 9),
      new THREE.Vector2(0.001, 9),
    ],
    40,
  );
  return {
    dentes,
    placa,
    crostas,
    lasca: new THREE.TetrahedronGeometry(0.32, 0),
    ponta: new THREE.TubeGeometry(curva, 48, 0.36, 12, false),
    taca,
    // a gengiva cobre mais a coroa e enche as papilas (baixa e funda, lia como retração depois da limpeza)
    gengiva: geometriaGengiva(vagas, { margem: 2.0, papila: 3.1, sobra: 6 }),
  };
}

export const FORMAS_CENA: Record<string, () => Formas> = {
  orto: formasOrto,
  estetica: formasEstetica,
  implante: formasImplante,
  profilaxia: formasProfilaxia,
  "tec-escaneamento": formasEscaneamento,
  "tec-simulacao": formasSimulacao,
};
