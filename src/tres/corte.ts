import * as THREE from "three";
import { gengiva } from "./materiais";

// O corte "de livro de anatomia": o plano tira a metade da frente da gengiva e do osso, e as faces de trás
// (vistas por dentro) são pintadas sem luz, com o desenho da seção. Fica parecendo uma face cortada, sem
// precisar fechar a malha.
// - Osso: trabéculas (cordões creme com espaços mais escuros, nítidos), a camada cortical mais densa na
//   crista e, em volta de cada raiz, a lâmina dura (uma linha fina mais escura) do alvéolo cortado.
// - Implante: o vão entre o osso e a rosca, que o osso novo (mais claro) vai ocupando na cicatrização.
// - Gengiva: rosa dessaturado, com uma linha clara fina na borda de fora.
// Embaixo, a seção se desfaz no fundo da página (só embaixo).

export const planoDoCorte = () => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

const AMOSTRAS = 64;
const X0 = -26;
const X1 = 26;
const RAIZES = 6;

const VERT = /* glsl */ `
#include <common>
#include <clipping_planes_pars_vertex>
varying vec3 vMundo;
varying vec3 vLocal;
void main() {
  #include <begin_vertex>
  #include <project_vertex>
  #include <clipping_planes_vertex>
  vMundo = (modelMatrix * vec4(position, 1.0)).xyz;
  vLocal = position;
}`;

const FRAG = /* glsl */ `
#include <common>
#include <clipping_planes_pars_fragment>
varying vec3 vMundo;
varying vec3 vLocal;
uniform float uLados;
uniform vec3 uCor;
uniform vec3 uCor2;
uniform float uTipo;          // 0 gengiva, 1 osso
uniform vec2 uDesvanece;
uniform float uCrista[${AMOSTRAS}];
uniform vec4 uRaiz[${RAIZES}];   // x do centro, y do topo, y do ápice, meia largura no topo
uniform vec2 uRaizB[${RAIZES}];  // curva, perfil (0 = raiz que afina, >0 = tronco: escala no fim)
uniform float uNRaizes;
uniform float uImpX;
uniform float uImpPonta;
uniform float uImpTopo;
uniform float uImpR0;
uniform float uImpR1;
uniform float uImpComp;
uniform float uVao;
uniform float uCura;
uniform float uImpLigado;

float crista(float x) {
  float f = clamp((x - ${X0.toFixed(1)}) / ${(X1 - X0).toFixed(1)}, 0.0, 1.0) * ${(AMOSTRAS - 1).toFixed(1)};
  int i = int(floor(f));
  int j = min(i + 1, ${AMOSTRAS - 1});
  return mix(uCrista[i], uCrista[j], f - float(i));
}

vec2 h2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
vec3 h3(vec3 p) {
  return fract(sin(vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)))) * 43758.5453);
}
// células em 3D (no espaço do objeto): os poros não esticam nas faces do lado
vec2 celulas3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = 0.15 + 0.7 * h3(i + g);
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  return vec2(d1, d2);
}
// distâncias ao ponto de célula mais próximo (x) e ao segundo (y)
vec2 celulas(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = 0.15 + 0.7 * h2(i + g);
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  return vec2(d1, d2);
}
float ruido(float x) { return fract(sin(x * 91.7) * 4375.85); }
float ruido2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = h2(i).x, b = h2(i + vec2(1.0, 0.0)).x, c = h2(i + vec2(0.0, 1.0)).x, d = h2(i + vec2(1.0, 1.0)).x;
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm2(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * ruido2(p); p = p * 2.07 + 13.1; a *= 0.5; }
  return v;
}

void main() {
  #include <clipping_planes_fragment>
  vec2 p = vLocal.xy;
  float topo = crista(p.x);
  vec3 c = uCor;
  if (uTipo > 0.5) {
    // trabéculas: os cordões ficam na divisa entre as células
    // osso esponjoso: um campo de ruído cortado num limiar dá cordões que se ligam e espaços
    // irregulares entre eles (nítidos, sem desfoque)
    // poros arredondados de tamanhos diferentes, em 3D e deformados pelo ruído (nítidos, sem estampa)
    vec3 l3 = vLocal;
    vec3 q = l3 * 0.85 + 0.55 * vec3(fbm2(p * 0.6), fbm2(p * 0.6 + 5.2), fbm2(p * 0.6 + 9.1)) + vec3(3.1, 7.7, 1.3);
    vec2 cel = celulas3(q);
    float raio = 0.22 + 0.24 * h3(floor(q) + 0.37).y;
    float poroG = 1.0 - smoothstep(raio - 0.03, raio + 0.02, cel.x);
    vec3 q2 = l3 * 2.0 + vec3(11.0, 2.0, 5.0);
    vec2 cel2 = celulas3(q2);
    float poroP = (1.0 - smoothstep(0.17, 0.22, cel2.x)) * step(0.45, h3(floor(q2)).x);
    float vazio = max(poroG, poroP);
    float borda = (1.0 - smoothstep(raio + 0.02, raio + 0.1, cel.x)) * (1.0 - vazio);
    c = mix(uCor, uCor2, vazio);
    c = mix(c, uCor * 0.97, borda * 0.4);
    // cortical: lisa e densa na crista e nas laterais do trecho cortado
    float dc = min(topo - p.y, uLados - abs(p.x));
    c = mix(c, uCor * 1.01, 1.0 - smoothstep(0.6, 1.15, dc));
    // lâmina dura em volta das raízes (e osso um pouco mais denso logo ao lado)
    for (int k = 0; k < ${RAIZES}; k++) {
      if (float(k) >= uNRaizes) break;
      vec4 r = uRaiz[k];
      vec2 rb = uRaizB[k];
      float u = (r.y - p.y) / (r.y - r.z);
      if (u < -0.02 || u > 1.0) continue;
      float uu = clamp(u, 0.0, 1.0);
      float esc = rb.y > 0.0 ? 1.0 - (1.0 - rb.y) * pow(uu, 1.4) : pow(1.0 - uu, 0.42) * 0.92 + 0.08 * (1.0 - uu);
      float meia = r.w * max(esc, 0.08) + 0.1;
      float dx = abs(p.x - (r.x + rb.x * uu * uu)) - meia;
      if (dx < 0.0 && u > 0.0 && u < 1.0) continue;
      float linha = 1.0 - smoothstep(0.08, 0.2, abs(dx));
      c = mix(c, vec3(0.97, 0.945, 0.9), 0.5 * (1.0 - smoothstep(0.2, 0.75, dx)) * step(0.0, dx));
      c = mix(c, vec3(0.6, 0.53, 0.43), linha * 0.85);
    }
    // o vão do implante e o osso novo que entra na rosca
    if (uImpLigado > 0.5 && p.y > uImpPonta - 0.3 && p.y < uImpTopo + 0.6) {
      float prog = clamp((p.y - uImpPonta) / uImpComp, 0.0, 1.0);
      float r = mix(uImpR1, uImpR0, prog) + 0.2;
      float irregular = 0.75 + 0.5 * ruido(floor(p.y * 3.2) + 7.0);
      float dx = abs(p.x - uImpX);
      if (uVao > 0.01 && dx > r - 0.3 && dx < r + uVao * irregular) c = vec3(0.55, 0.49, 0.41);
      float novo = (1.0 - smoothstep(r, r + 0.85, dx)) * step(r - 0.3, dx) * uCura * (1.0 - smoothstep(0.75, 1.0, uCura));
      c = mix(c, vec3(0.985, 0.965, 0.92), novo * 0.75);
    }
  } else {
    // gengiva: uma linha clara fina na borda de fora; abaixo da capa, nada
    float dc = topo - p.y;
    if (dc > 3.3) discard;
    c = mix(c, vec3(0.93, 0.8, 0.77), 1.0 - smoothstep(0.12, 0.32, dc));
  }
  c *= 0.93 + 0.07 * smoothstep(uDesvanece.x, topo, p.y);
  gl_FragColor = vec4(c, smoothstep(uDesvanece.x, uDesvanece.y, vMundo.y));
  #include <colorspace_fragment>
}`;

export type Raiz = { cx: number; y0: number; y1: number; meia: number; curva?: number; fim?: number };

export type UniformesCorte = {
  uImpX: { value: number };
  uImpPonta: { value: number };
  uImpTopo: { value: number };
  uImpR0: { value: number };
  uImpR1: { value: number };
  uImpComp: { value: number };
  uVao: { value: number };
  uCura: { value: number };
  uImpLigado: { value: number };
  [k: string]: { value: unknown };
};

export function materialDoCorte(
  plano: THREE.Plane,
  o: { tipo: "gengiva" | "osso"; cor: string; cor2?: string; crista: (x: number) => number; raizes?: Raiz[]; desvanece?: [number, number]; lados?: number; frente?: boolean },
) {
  const crista = Array.from({ length: AMOSTRAS }, (_, i) => o.crista(X0 + ((X1 - X0) * i) / (AMOSTRAS - 1)));
  const raizes = o.raizes ?? [];
  const uRaiz = Array.from({ length: RAIZES }, (_, i) => {
    const r = raizes[i];
    return r ? new THREE.Vector4(r.cx, r.y0, r.y1, r.meia) : new THREE.Vector4(0, 0, 0, 0);
  });
  const uRaizB = Array.from({ length: RAIZES }, (_, i) => {
    const r = raizes[i];
    return r ? new THREE.Vector2(r.curva ?? 0, r.fim ?? 0) : new THREE.Vector2(0, 0);
  });
  const uniforms = {
    uCor: { value: new THREE.Color(o.cor) },
    uCor2: { value: new THREE.Color(o.cor2 ?? o.cor) },
    uTipo: { value: o.tipo === "osso" ? 1 : 0 },
    uLados: { value: o.lados ?? 400 },
    uDesvanece: { value: new THREE.Vector2(...(o.desvanece ?? [-40, -39])) },
    uCrista: { value: crista },
    uRaiz: { value: uRaiz },
    uRaizB: { value: uRaizB },
    uNRaizes: { value: raizes.length },
    uImpX: { value: 0 },
    uImpPonta: { value: 0 },
    uImpTopo: { value: 0 },
    uImpR0: { value: 2.2 },
    uImpR1: { value: 1.75 },
    uImpComp: { value: 10 },
    uVao: { value: 0 },
    uCura: { value: 0 },
    uImpLigado: { value: 0 },
  } as UniformesCorte;
  const m = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    // frente: o mesmo desenho nas faces de fora do osso (as pontas do trecho cortado, vistas no giro)
    side: o.frente ? THREE.FrontSide : THREE.BackSide,
    clipping: true,
    clippingPlanes: [plano],
    transparent: true,
  });
  return { material: m, uniforms };
}

// Compõe com o que o material já tinha (o relevo do esmalte e da gengiva, por exemplo).
export function encadeia(m: THREE.Material, chave: string, f: (sh: THREE.WebGLProgramParametersWithUniforms) => void) {
  const antes = m.onBeforeCompile;
  const chaveAntes = m.customProgramCacheKey();
  m.onBeforeCompile = (sh, r) => {
    antes.call(m, sh, r);
    f(sh);
  };
  m.customProgramCacheKey = () => `${chaveAntes}|${chave}`;
}

// A parte de baixo de um material some aos poucos no fundo da página (só embaixo; as pontas em x, se
// pedido). O alcance fica num objeto compartilhado: a cena pode mudar o desvanecimento no meio do filme.
export type Desvanece = { y: THREE.Vector2; x: THREE.Vector2 };

export function desvaneceEmbaixo<T extends THREE.Material>(m: T, d: Desvanece): T {
  m.transparent = true;
  encadeia(m, "desvanece", (sh) => {
    sh.uniforms.uDesvY = { value: d.y };
    sh.uniforms.uDesvX = { value: d.x };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vPosMundo;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPosMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vPosMundo;\nuniform vec2 uDesvY;\nuniform vec2 uDesvX;")
      .replace(
        "#include <dithering_fragment>",
        "#include <dithering_fragment>\ngl_FragColor.a *= smoothstep(uDesvY.x, uDesvY.y, vPosMundo.y) * (1.0 - smoothstep(uDesvX.x, uDesvX.y, length(vPosMundo.xz)));",
      );
  });
  return m;
}

// O contrário: a parte de cima some aos poucos (a película da placa, que não termina numa linha reta).
export function desvaneceEmCima<T extends THREE.Material>(m: T, y0: number, y1: number): T {
  m.transparent = true;
  encadeia(m, `cima-${y0}-${y1}`, (sh) => {
    sh.uniforms.uCima = { value: new THREE.Vector2(y0, y1) };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vAlturaCima;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvAlturaCima = (modelMatrix * vec4(transformed, 1.0)).y;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vAlturaCima;\nuniform vec2 uCima;")
      .replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.a *= 1.0 - smoothstep(uCima.x, uCima.y, vAlturaCima);");
  });
  return m;
}

// A gengiva da arcada de cima (montada de coroa para cima e virada): some no fundo da página por cima e nas
// pontas. Em "fica" e "some", a mesma malha em duas partes: a opaca (que o alinhador refrata) e a que se
// desfaz (transparente); em "toda", uma peça só que se desfaz.
export type SomeGengiva = { y: [number, number]; r: [number, number]; centroZ: number; porX?: boolean };

export function gengivaQueSome(parte: "fica" | "some" | "toda", c: SomeGengiva) {
  const m = gengiva();
  m.transparent = parte !== "fica";
  const corte =
    parte === "fica" ? "if (fica < 0.999) discard;" : parte === "some" ? "if (fica >= 0.999) discard;\n  gl_FragColor.a *= fica;" : "gl_FragColor.a *= fica;";
  const distancia = c.porX ? "abs(vMundoG.x)" : `length(vMundoG.xz - vec2(0.0, ${c.centroZ.toFixed(2)}))`;
  encadeia(m, `gengiva-some-${parte}-${c.y.join("-")}-${c.r.join("-")}-${c.centroZ}-${c.porX ? "x" : "r"}`, (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vMundoG;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMundoG = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vMundoG;").replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>
  float fica = (1.0 - smoothstep(${c.y[0].toFixed(2)}, ${c.y[1].toFixed(2)}, vMundoG.y)) * (1.0 - smoothstep(${c.r[0].toFixed(2)}, ${c.r[1].toFixed(2)}, ${distancia}));
  ${corte}`,
    );
  });
  return m;
}
