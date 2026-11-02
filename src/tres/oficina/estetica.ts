import * as THREE from "three";
import { arcada, type Vaga } from "../arcada";
import { FORMAS, geometriaDente, inflar } from "../dente";
import { geometriaGengiva } from "../gengiva";

// T2 · Estética: os seis dentes da frente de cima, montados de coroa para cima (a cena vira o grupo).
// O central do lado 1 está escuro e lascado (recebe a faceta); o lateral do lado -1 está curto (recebe as
// camadas da restauração). A lupa mostra o central cortado ao meio, de perfil, com a faceta só na frente.

// os caninos do T2: a ponta entre 0,5 e 1 mm acima da borda dos centrais, arredondada (sem cara de presa)
const CANINO_T2 = { ...FORMAS.canino, altura: 9.0, ponta: 0.75, cuspideRedonda: true };
export const vagasEstetica = () => arcada(false, 3, 0.1, 1).map((v) => (v.nome === "canino" ? { ...v, forma: CANINO_T2 } : v));
export const ehEscuro = (v: Vaga) => v.lado === 1 && v.ordem === 0;
export const ehCurto = (v: Vaga) => v.lado === -1 && v.ordem === 1;
export const CURTO = 0.82; // o lateral curto tem 82% da altura
export const CAMADAS = { de: 0.72 }; // as camadas refazem a coroa do lateral a partir de 72% da altura

const mesial = (v: Vaga) => (v.lado === 1 ? -1 : 1) as 1 | -1;
// os dois centrais se tocam no terço da borda (sem o vão em V logo abaixo da papila)
const CONTATO = 0.6;
const CORES: [string, string, string] = ["#efe5d3", "#fbf7ee", "#dfe7ec"];
// o central escuro: amarelo-acinzentado, mais fundo no colo
const CORES_ESCURO: [string, string, string] = ["#a99880", "#bfb29a", "#b6b2a8"];

// ---------------------------------------------------------------- a seção do central (para a lupa)
type P2 = [number, number];

// o perfil do central no meio do dente (x = 0): da ponta da raiz, pela face de fora, até a borda, e de volta
// pela face de dentro. Em (z, y) do dente, coroa para cima.
function perfilDoCentral() {
  const N = 56;
  const g = geometriaDente(FORMAS.central, { raiz: true, segmentos: N, mesial: -1 });
  const p = g.attributes.position as THREE.BufferAttribute;
  const aneis = Math.floor(p.count / N);
  const fora: P2[] = [];
  const dentro: P2[] = [];
  for (let k = 0; k < aneis; k++) {
    fora.push([p.getZ(k * N + N / 4), p.getY(k * N + N / 4)]);
    dentro.push([p.getZ(k * N + (3 * N) / 4), p.getY(k * N + (3 * N) / 4)]);
  }
  return { fora, dentro };
}

// interpola a face (lista de pontos ordenados por y crescente na parte de interesse) numa altura y
function naAltura(face: P2[], y: number) {
  for (let i = 0; i < face.length - 1; i++) {
    const [z0, y0] = face[i];
    const [z1, y1] = face[i + 1];
    if ((y0 - y) * (y1 - y) <= 0 && y0 !== y1) return z0 + ((z1 - z0) * (y - y0)) / (y1 - y0);
  }
  return face[face.length - 1][0];
}

// o perfil do central como amostras em y (para o desenho do corte na lupa): cada ponto é (y, face de fora,
// face de dentro), da ponta da raiz até perto da borda
export const AMOSTRAS_PERFIL = 64;
function perfilAmostrado() {
  const { fora, dentro } = perfilDoCentral();
  const H = FORMAS.central.altura;
  const subida = (face: P2[]) => face.filter(([, y]) => y <= H - 0.7);
  const fF = subida(fora);
  const fD = subida(dentro);
  const y0 = fora[0][1] + 0.3;
  const y1 = H - 0.7;
  const pts: number[] = [];
  for (let i = 0; i < AMOSTRAS_PERFIL; i++) {
    const y = y0 + ((y1 - y0) * i) / (AMOSTRAS_PERFIL - 1);
    pts.push(y, naAltura(fF, y), naAltura(fD, y));
  }
  // o contorno da coroa (z, y): da face de fora no colo, pela borda, até a face de dentro no colo; a faceta
  // mede a distância até ele para desenhar o cimento (na face e por cima da borda, sem interrupção)
  const coroa = [...fora, ...[...dentro].reverse()].filter(([, y]) => y >= -0.3);
  const passo = Math.max(1, Math.ceil(coroa.length / CONTORNO));
  const contorno: number[] = [];
  for (let i = 0; i < coroa.length && contorno.length / 3 < CONTORNO; i += passo) contorno.push(coroa[i][0], coroa[i][1], 0);
  while (contorno.length / 3 < CONTORNO) contorno.push(...contorno.slice(-3));
  return {
    geo: new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)),
    contorno: new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(contorno, 3)),
  };
}
export const CONTORNO = 72;

// A faceta com espessura: uma casca que acompanha a face da frente (convexa), de ~0,3 mm no colo a ~0,7 mm na
// borda, dobrando por cima dela; fechada nas beiradas (para o corte mostrar a lâmina).
function facetaGrossa(aj: Parameters<typeof geometriaDente>[1]) {
  const H = FORMAS.central.altura;
  const base = geometriaDente(FORMAS.central, { ...aj, soFrente: 0.15 });
  const p = base.attributes.position as THREE.BufferAttribute;
  const n = base.attributes.normal as THREE.BufferAttribute;
  const c = base.attributes.color as THREE.BufferAttribute;
  const N = p.count;
  const suave = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const pos: number[] = [];
  const cor: number[] = [];
  for (const camada of [0, 1]) {
    for (let i = 0; i < N; i++) {
      const e = camada === 0 ? 0.02 : 0.02 + 0.3 + 0.4 * suave(0.12 * H, 0.95 * H, p.getY(i));
      pos.push(p.getX(i) + n.getX(i) * e, p.getY(i) + n.getY(i) * e, p.getZ(i) + n.getZ(i) * e);
      cor.push(c.getX(i), c.getY(i), c.getZ(i));
    }
  }
  const ix = base.index!.array;
  const idx: number[] = [];
  const contagem = new Map<string, number>();
  const chave = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);
  for (let t = 0; t < ix.length; t += 3) {
    const [a, b, d] = [ix[t], ix[t + 1], ix[t + 2]];
    idx.push(N + a, N + b, N + d); // por fora: como a face do dente
    idx.push(a, d, b); // por dentro: virada para o dente
    for (const [u, v] of [
      [a, b],
      [b, d],
      [d, a],
    ])
      contagem.set(chave(u, v), (contagem.get(chave(u, v)) ?? 0) + 1);
  }
  // as beiradas (arestas de um triângulo só): uma parede entre a casca de fora e a de dentro
  for (let t = 0; t < ix.length; t += 3) {
    const tri = [ix[t], ix[t + 1], ix[t + 2]];
    for (let k = 0; k < 3; k++) {
      const a = tri[k];
      const b = tri[(k + 1) % 3];
      if (contagem.get(chave(a, b)) !== 1) continue;
      idx.push(N + a, a, b, N + a, b, N + b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// As peças da lupa, no espaço do central (coroa para cima): o dente com a raiz, a faceta com espessura e o
// perfil amostrado (para o desenho do corte).
export function pecasDaLupa(aj: Parameters<typeof geometriaDente>[1], ajFaceta: Parameters<typeof geometriaDente>[1]) {
  const { geo, contorno } = perfilAmostrado();
  return {
    lupaDente: geometriaDente(FORMAS.central, { ...aj, raiz: true, segmentos: 64 }),
    lupaFaceta: facetaGrossa(ajFaceta),
    lupaPerfil: geo,
    lupaContorno: contorno,
  };
}

// uma casca que anda pela normal quanto a função da altura mandar (+ para fora, - para dentro)
function inflarPorAltura(g: THREE.BufferGeometry, d: (y: number) => number) {
  const out = g.clone();
  const p = out.attributes.position as THREE.BufferAttribute;
  const n = out.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const k = d(p.getY(i));
    p.setXYZ(i, p.getX(i) + n.getX(i) * k, p.getY(i) + n.getY(i) * k, p.getZ(i) + n.getZ(i) * k);
  }
  p.needsUpdate = true;
  out.computeVertexNormals();
  return out;
}

// ---------------------------------------------------------------- as formas da cena
export function formasEstetica() {
  const vagas = vagasEstetica();
  const lateral = vagas.find(ehCurto)!;
  const central = vagas.find(ehEscuro)!;
  const dentes = vagas.map((v) =>
    geometriaDente(v.forma, {
      mesial: mesial(v),
      tronco: 2.4,
      cores: ehEscuro(v) ? CORES_ESCURO : CORES,
      escalaAltura: ehCurto(v) ? CURTO : 1,
      contato: v.ordem === 0 ? CONTATO : 0,
      // a lasca no canto de fora do central escuro
      lasca: ehEscuro(v) ? 2.3 : 0,
      ladoLasca: ehEscuro(v) ? (-mesial(v) as 1 | -1) : 1,
    }),
  );
  // a faceta: a metade da frente do central sem lasca, 0,3 mm por fora
  const faceta = inflar(geometriaDente(central.forma, { mesial: mesial(central), soFrente: 0.15, cores: CORES, contato: CONTATO }), 0.3);
  // as camadas do lateral curto: a dentina por dentro (mais quente), o esmalte por fora e a borda translúcida
  const aj = { mesial: mesial(lateral), cores: CORES };
  const dentina = inflarPorAltura(geometriaDente(lateral.forma, { ...aj, faixa: [CAMADAS.de, 1] }), (y) => {
    const t = Math.min(1, Math.max(0, (y - CURTO * FORMAS.lateral.altura) / 1.0));
    return 0.03 - 0.47 * t * t * (3 - 2 * t);
  });
  const esmalte = inflar(geometriaDente(lateral.forma, { ...aj, faixa: [CAMADAS.de, 1] }), 0.04);
  const borda = inflar(geometriaDente(lateral.forma, { ...aj, faixa: [0.88, 1] }), 0.09);
  // o lateral refeito, inteiro: entra no lugar do curto e das camadas quando elas já se igualaram
  const lateralInteiro = geometriaDente(lateral.forma, { mesial: mesial(lateral), tronco: 2.4, cores: CORES });
  // a escala de cor: uma plaqueta em forma de dente (a cena pinta cada uma de um tom)
  const plaqueta = geometriaDente(FORMAS.lateral, { segmentos: 28, mesial: 1, cores: ["#ffffff", "#ffffff", "#ffffff"] });
  return {
    dentes,
    faceta,
    camadas: [dentina, esmalte, borda],
    lateralInteiro,
    plaqueta,
    // de frente: a margem cobre o colo em arco em cada dente e a papila enche o vão até perto do contato; a
    // faixa segue até depois dos caninos e some no fundo
    gengiva: geometriaGengiva(vagas, { margem: 2.0, papila: 3.0, expoentePapila: 3, sobra: 12 }),
    // a lupa: o central escuro cortado ao meio, com a faceta (do central sem lasca)
    ...pecasDaLupa({ mesial: mesial(central), cores: CORES_ESCURO }, { mesial: mesial(central), cores: CORES }),
  };
}
