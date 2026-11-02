import * as THREE from "three";

// Peças geradas por código: o bloco de gengiva e de osso (um trecho reto da arcada de baixo), o implante
// com a rosca, o pilar. Unidades em milímetros.

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Bloco ao longo de x: em cada x, uma seção retangular de cantos redondos (em y e z) que vai do fundo
// até o "topo(x)"; as pontas em x se arredondam. Serve para a gengiva e para o osso.
export function geometriaBloco(o: {
  x0: number;
  x1: number;
  fundo: number;
  topo: (x: number) => number;
  meia: number; // meia espessura em z
  raio: number; // raio dos cantos da seção
  pontas: number; // raio das pontas em x
  cor: (x: number, y: number, z: number) => THREE.Color;
  // relevo na face da frente (z > 0): as raízes dos dentes levantam a gengiva
  relevo?: (x: number, y: number) => number;
  nx?: number;
  nv?: number;
}): THREE.BufferGeometry {
  const NX = o.nx ?? 160;
  const NV = o.nv ?? 64;
  const pos: number[] = [];
  const cor: number[] = [];
  // perímetro da seção: um retângulo (z de -meia a +meia, y de fundo a topo) com cantos de raio r,
  // percorrido por um ângulo
  const secao = (t: number, alto: number, meia: number, r: number): [number, number] => {
    // superelipse: suaviza os cantos sem descontinuidade
    const c = Math.cos(t);
    const s = Math.sin(t);
    const n = 2 + 8 * (1 - Math.min(1, r / Math.min(meia, alto / 2)));
    const sz = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const sy = Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    return [sz * meia, sy * (alto / 2)];
  };
  for (let i = 0; i <= NX; i++) {
    const u = i / NX;
    const x = o.x0 + (o.x1 - o.x0) * u;
    const dPonta = Math.min(x - o.x0, o.x1 - x);
    const k = dPonta < o.pontas ? Math.sqrt(Math.max(0.02, 1 - Math.pow(1 - dPonta / o.pontas, 2))) : 1;
    const topo = o.topo(x);
    const alto = (topo - o.fundo) * (0.55 + 0.45 * k);
    const meio = o.fundo + (topo - o.fundo) - alto / 2;
    for (let j = 0; j < NV; j++) {
      const t = (j / NV) * Math.PI * 2;
      const [z0, y] = secao(t, alto, o.meia * k, o.raio);
      const yy = meio + y;
      const z = o.relevo && z0 > 0 ? z0 + o.relevo(x, yy) * Math.pow(z0 / (o.meia * k), 3) : z0;
      pos.push(x, yy, z);
      const c = o.cor(x, yy, z);
      cor.push(c.r, c.g, c.b);
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NV; j++) {
      const a = i * NV + j;
      const b = i * NV + ((j + 1) % NV);
      const c = (i + 1) * NV + j;
      const d = (i + 1) * NV + ((j + 1) % NV);
      idx.push(a, c, b, b, c, d);
    }
  }
  // tampas nas pontas (pequenas, porque a seção já se fecha)
  for (const [ini, inv] of [
    [0, true],
    [NX * NV, false],
  ] as const) {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let j = 0; j < NV; j++) {
      cx += pos[(ini + j) * 3];
      cy += pos[(ini + j) * 3 + 1];
      cz += pos[(ini + j) * 3 + 2];
    }
    const centro = pos.length / 3;
    pos.push(cx / NV, cy / NV, cz / NV);
    const c0 = o.cor(cx / NV, cy / NV, cz / NV);
    cor.push(c0.r, c0.g, c0.b);
    for (let j = 0; j < NV; j++) {
      const a = ini + j;
      const b = ini + ((j + 1) % NV);
      if (inv) idx.push(centro, a, b);
      else idx.push(centro, b, a);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// O implante numa superfície só: o corpo levemente cônico, a rosca em V em hélice (r = núcleo + onda
// triangular de θ e y), o colar liso em cima e a ponta cônica embaixo. O topo da plataforma fica em
// y = 0; a ponta em y = -comprimento.
export function geometriaImplante(comprimento = 10, raioTopo = 2.2, raioPonta = 1.75) {
  const passo = 0.82;
  const funda = 0.34; // profundidade da rosca (de um lado ao outro da onda)
  const NU = 64;
  const NV = 260;
  const colar = 1.1;
  const pontaAlt = 1.9;
  const pos: number[] = [];
  const nucleo = (y: number) => {
    // y de 0 (topo) a -comprimento (ponta)
    const t = Math.min(1, Math.max(0, (-y - colar) / (comprimento - colar - pontaAlt)));
    let r = raioTopo - 0.05 - (raioTopo - raioPonta) * t;
    const dPonta = comprimento + y; // distância até a ponta
    if (dPonta < pontaAlt) r *= 0.42 + 0.58 * Math.sin((dPonta / pontaAlt) * (Math.PI / 2));
    return r;
  };
  const fio = (y: number) => {
    // a rosca entra logo abaixo do colar e some perto da ponta
    const dTopo = -y - colar;
    const dPonta = comprimento + y;
    return suave(0, 0.5, dTopo) * suave(0.2, 1.2, dPonta);
  };
  for (let j = 0; j <= NV; j++) {
    const y = -(j / NV) * comprimento;
    for (let i = 0; i < NU; i++) {
      const th = (i / NU) * Math.PI * 2;
      const fase = -y / passo + th / (Math.PI * 2);
      const tri = 1 - Math.abs(2 * (fase - Math.floor(fase)) - 1); // 0 no fundo da rosca, 1 na crista
      const r = nucleo(y) + funda * (tri - 0.5) * fio(y) + (y > -colar ? 0.05 : 0);
      pos.push(Math.cos(th) * r, y, Math.sin(th) * r);
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < NV; j++)
    for (let i = 0; i < NU; i++) {
      const a = j * NU + i;
      const b = j * NU + ((i + 1) % NU);
      const c = (j + 1) * NU + i;
      const d = (j + 1) * NU + ((i + 1) % NU);
      idx.push(a, b, c, b, d, c);
    }
  // plataforma (em cima) e ponta (embaixo)
  const topo = pos.length / 3;
  pos.push(0, 0.02, 0);
  for (let i = 0; i < NU; i++) idx.push(topo, (i + 1) % NU, i);
  const ponta = pos.length / 3;
  pos.push(0, -comprimento - 0.05, 0);
  for (let i = 0; i < NU; i++) idx.push(ponta, NV * NU + i, NV * NU + ((i + 1) % NU));
  const corpo = new THREE.BufferGeometry();
  corpo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  corpo.setIndex(idx);
  corpo.computeVertexNormals();
  return { corpo };
}

// O pilar: a peça que liga o implante à coroa (base em y = 0, topo em y = altura).
export function geometriaPilar(altura = 5.2, raioBase = 1.9, raioTopo = 1.25) {
  const perfil = [
    new THREE.Vector2(0.001, 0),
    new THREE.Vector2(raioBase * 0.85, 0),
    new THREE.Vector2(raioBase, 0.35),
    new THREE.Vector2(raioBase * 1.02, 1.3),
    new THREE.Vector2(raioBase * 0.88, 1.9),
    new THREE.Vector2(raioTopo * 1.05, altura - 0.5),
    new THREE.Vector2(raioTopo, altura - 0.12),
    new THREE.Vector2(raioTopo * 0.8, altura),
    new THREE.Vector2(0.001, altura),
  ];
  return new THREE.LatheGeometry(perfil, 40);
}

export { suave as suaveFaixa };
