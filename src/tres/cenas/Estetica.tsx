"use client";

import { Line, PerspectiveCamera, RenderTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { type ComponentRef, type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Ambiente } from "../Ambiente";
import { encadeia, gengivaQueSome } from "../corte";
import { FORMAS } from "../dente";
import { FILMES, janela, mix, sobe, trecho } from "../filme";
import { esmalte, porcelana } from "../materiais";
import { AMOSTRAS_PERFIL, CAMADAS, CONTORNO, ehCurto, ehEscuro, vagasEstetica } from "../oficina/estetica";
import { uma, useFormas, varias } from "../oficina/usaFormas";
import { Preparo } from "../Preparo";
import { ehToque, useCenaPronta } from "@/lib/tres";

// T2 · Estética do sorriso. Os seis dentes da frente de cima, de frente, com a câmera na altura das bordas.
// O central da esquerda (na tela) está escuro e lascado; o lateral da direita está curto.
// 1) avaliar: a medida da largura de cada dente (a proporção) e a escala de cor, com a plaqueta que combina;
// 2) a faceta (porcelana, sem iridescência) assenta na frente do central escuro e, assentada, toma o grão e o
//    tom dos vizinhos; a lupa da esquerda mostra o central cortado ao meio, girado uns 20°: a lâmina fica só
//    na frente, colada por uma linha fina de cimento;
// 3) a lupa da direita aproxima a ponta do lateral curto: três camadas chegam em tons diferentes (dentina,
//    esmalte, borda translúcida) e só se igualam no último quadro.

const P = {
  medida: [0.04, 0.12, 0.17, 0.2],
  escala: [0.18, 0.24, 0.3, 0.34],
  faceta: [0.34, 0.46],
  facetaIguala: [0.47, 0.52],
  lupa: [0.36, 0.42, 0.6, 0.64],
  lupa2: [0.62, 0.66, 0.95, 0.99],
  dentina: [0.66, 0.72],
  esmalte: [0.74, 0.8],
  borda: [0.82, 0.88],
  iguala: [0.91, 0.98],
} as const;
const H_LATERAL = FORMAS.lateral.altura - FORMAS.lateral.topo; // altura da coroa inteira do lateral até o ombro
const Y_CAMADAS = CAMADAS.de * H_LATERAL; // onde as camadas começam (no espaço do dente)
const TONS = ["#f6f0e3", "#f1e7d3", "#ead9bb", "#e2cda8", "#d6bf98", "#c9b08a"]; // a escala de cor
const COMBINA = 1; // a plaqueta que combina com os vizinhos
const DENTINA = "#d7c8ad"; // L* ~81, b* ~15: quente e fosca, sem cara de ouro
const ESMALTE_SEPARADO = "#f3f4f1"; // enquanto separado, um branco neutro, mais claro que o dente (o azul é só da borda)
type Linha2 = ComponentRef<typeof Line>;
// o lado da textura de cada lupa, multiplicado pela densidade da tela: no celular, a lupa é pequena e a tela tem o
// dobro de pixels (com 640, seriam duas texturas de 1280, com antisserrilhado, sem ganho nenhum na imagem)
const LADO_LUPA = ehToque() ? 320 : 640;

// o fundo das lupas: o rebaixo no reboco, com a sombra por dentro no alto à esquerda e um fio de luz embaixo
function texturaDaLupa() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(300, 300, 150, 270, 270, 262);
  g.addColorStop(0, "rgba(61,44,25,0)");
  g.addColorStop(0.72, "rgba(61,44,25,0.05)");
  g.addColorStop(1, "rgba(61,44,25,0.32)");
  x.fillStyle = g;
  x.beginPath();
  x.arc(256, 256, 254, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = "rgba(255,252,246,0.85)";
  x.lineWidth = 3;
  x.beginPath();
  x.arc(256, 256, 251, -0.2, Math.PI * 0.62);
  x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const CABECA_CORTE = `#include <common>
#include <clipping_planes_pars_vertex>
varying vec3 vMundo;
void main() {
  #include <begin_vertex>
  #include <project_vertex>
  #include <clipping_planes_vertex>
  vMundo = (modelMatrix * vec4(position, 1.0)).xyz;
}`;

// O desenho do corte (como no T3): as faces de trás da metade que ficou, vistas pela abertura, são pintadas
// com a seção no plano do corte (x = 0 no mundo da lupa). Cada fragmento acha o ponto do plano na linha de
// visão e desenha ali o esmalte, a dentina e a polpa (no dente) ou a porcelana e o cimento (na faceta).
function materialDoCorteDoDente(perfil: Float32Array, contorno: Float32Array, plano: THREE.Plane, tipo: "dente" | "faceta") {
  const N = AMOSTRAS_PERFIL;
  const fora = Array.from({ length: N }, (_, i) => perfil[i * 3 + 1]);
  const dentro = Array.from({ length: N }, (_, i) => perfil[i * 3 + 2]);
  const pontos = Array.from({ length: CONTORNO }, (_, i) => new THREE.Vector2(contorno[i * 3], contorno[i * 3 + 1]));
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uCam: { value: new THREE.Vector3() },
      uContorno: { value: pontos },
      uFora: { value: fora },
      uDentro: { value: dentro },
      uY0: { value: perfil[0] },
      uDY: { value: perfil[3] - perfil[0] },
      uH: { value: FORMAS.central.altura },
    },
    vertexShader: CABECA_CORTE,
    fragmentShader: `#include <common>
#include <clipping_planes_pars_fragment>
varying vec3 vMundo;
uniform vec3 uCam;
uniform float uFora[${N}];
uniform float uDentro[${N}];
uniform float uY0;
uniform float uDY;
uniform float uH;
uniform vec2 uContorno[${CONTORNO}];
// a distância do ponto (z, y) até o contorno da coroa
float aoDente(vec2 p) {
  float d = 1e3;
  for (int i = 0; i < ${CONTORNO - 1}; i++) {
    vec2 a = uContorno[i];
    vec2 ba = uContorno[i + 1] - a;
    float h = clamp(dot(p - a, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    d = min(d, length(p - a - ba * h));
  }
  return d;
}
float amostra(float y, bool deFora) {
  float f = clamp((y - uY0) / uDY, 0.0, ${(N - 1).toFixed(1)});
  int i = int(floor(f));
  int j = min(i + 1, ${N - 1});
  return deFora ? mix(uFora[i], uFora[j], f - float(i)) : mix(uDentro[i], uDentro[j], f - float(i));
}
void main() {
  #include <clipping_planes_fragment>
  vec3 d = normalize(vMundo - uCam);
  vec3 q = uCam + d * (-uCam.x / d.x);
  float y = -q.y; // no espaço do dente (a lupa vira o dente: coroa para baixo)
  float z = q.z;
  float zf = amostra(min(y, uH - 0.7), true);
  float zl = amostra(min(y, uH - 0.7), false);
  vec3 c;
  ${
    tipo === "faceta"
      ? `// porcelana perolada (branco frio, com um brilho que corre pela espessura); junto ao dente, a linha fina
  // de cimento, contornando a face e a borda sem interrupção
  float dd = aoDente(vec2(z, y));
  c = mix(vec3(0.975, 0.98, 0.99), vec3(0.93, 0.945, 0.965), smoothstep(0.05, 0.75, dd));
  c += vec3(0.02, 0.02, 0.025) * sin(dd * 9.0 + y * 0.6);
  c = mix(c, vec3(0.82, 0.77, 0.68), 1.0 - smoothstep(0.055, 0.11, dd));`
      : `float h = clamp(y / uH, 0.0, 1.0);
  // esmalte: fino no colo, grosso na borda; mais translúcido (frio) perto da borda
  float ef = 0.35 + 1.05 * pow(h, 1.35);
  float el = 0.3 + 0.65 * pow(h, 1.35);
  float zc = (zf + zl) * 0.5;
  float topoDentina = uH - 2.0 - 0.25 * abs(z - zc);
  bool esm = y > 0.0 && (z > zf - ef || z < zl + el || y > topoDentina);
  float raio = y < 0.0 ? 0.12 + 0.36 * clamp((y - uY0) / -uY0, 0.0, 1.0) : 0.5 * (1.0 - pow(clamp(y / (0.42 * uH), 0.0, 1.0), 2.0)) + 0.05;
  float dp = abs(z - zc) - raio;
  if (esm) {
    c = mix(vec3(0.945, 0.915, 0.855), vec3(0.88, 0.905, 0.915), smoothstep(0.55, 1.0, h));
  } else if (dp < 0.0 && y < 0.42 * uH) {
    // polpa: mais funda no meio
    float k = clamp(-dp / max(raio, 0.05), 0.0, 1.0);
    c = mix(vec3(0.88, 0.62, 0.58), vec3(0.8, 0.5, 0.47), k);
  } else {
    // dentina: quente e fosca, um pouco mais escura perto da polpa; na raiz, o cemento fino por fora
    c = mix(vec3(0.9, 0.82, 0.66), vec3(0.85, 0.75, 0.58), 1.0 - smoothstep(0.0, 1.4, dp));
    if (y < 0.0 && (z > zf - 0.1 || z < zl + 0.1)) c = vec3(0.87, 0.8, 0.67);
  }`
  }
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`,
    side: THREE.BackSide,
    clipping: true,
    clippingPlanes: [plano],
  });
  // a faceta encosta no dente: um pouco à frente na profundidade, para as duas não disputarem o mesmo ponto
  if (tipo === "faceta") {
    m.polygonOffset = true;
    m.polygonOffsetFactor = -1;
    m.polygonOffsetUnits = -1;
  }
  return m;
}

// uma lupa presa à câmera: o disco com a cena dela por dentro e o rebaixo por cima
function Lupa({
  grupo,
  disco,
  vao,
  posicao,
  raio,
  ligada,
  children,
}: {
  grupo: RefObject<THREE.Group | null>;
  disco: RefObject<THREE.MeshBasicMaterial | null>;
  vao: THREE.Material;
  posicao: [number, number, number];
  raio: number;
  ligada: boolean;
  children: ReactNode;
}) {
  // a textura fica sempre no material (montar e desmontar deixava a lupa branca depois de um salto da
  // rolagem); só o desenho dela liga e desliga. Ligando, pede um quadro (a tela só desenha quando pedem).
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [ligada, invalidate]);
  return (
    <group ref={grupo} position={posicao} visible={false}>
      <mesh renderOrder={20}>
        <circleGeometry args={[raio, 96]} />
        <meshBasicMaterial ref={disco} transparent depthTest={false} toneMapped>
          <RenderTexture attach="map" width={LADO_LUPA} height={LADO_LUPA} samples={4} frames={ligada ? Infinity : 0}>
            {children}
          </RenderTexture>
        </meshBasicMaterial>
      </mesh>
      <mesh renderOrder={21} material={vao}>
        <circleGeometry args={[raio + 0.01, 96]} />
      </mesh>
    </group>
  );
}

export function CenaEstetica({ p: fixo }: { p?: number }) {
  const formas = useFormas("estetica");
  const preparada = useCenaPronta("estetica");
  const vagas = useMemo(vagasEstetica, []);
  const escuro = useMemo(() => vagas.find(ehEscuro)!, [vagas]);
  const curto = useMemo(() => vagas.find(ehCurto)!, [vagas]);
  // o plano do corte da lupa: fica a metade de x >= 0 (no mundo da lupa)
  const plano = useMemo(() => new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), []);

  const mat = useMemo(() => {
    // o esmalte do T2: grão mais fino e mais fraco, igual em todos os dentes (e na faceta assentada)
    const esmT2 = () => esmalte(false, 4.4, 0.035);
    // as camadas: cada uma com o próprio tom, a base que some no dente (sem degrau) e transparência
    const camada = (tom: string, rugosidade: number, fosca = false) => {
      const m = esmT2();
      m.color = new THREE.Color(tom);
      m.roughness = rugosidade;
      m.transparent = true;
      if (fosca) {
        // a dentina: a cor exata (sem a cor do dente por baixo), fosca, sem brilho nem borda
        m.vertexColors = false;
        m.clearcoat = 0;
        m.sheen = 0;
        m.specularIntensity = 0.2;
      }
      encadeia(m, "camada-base", (sh) => {
        sh.uniforms.uBase = { value: Y_CAMADAS };
        sh.vertexShader = sh.vertexShader
          .replace("#include <common>", "#include <common>\nvarying float vAlt;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvAlt = position.y;");
        sh.fragmentShader = sh.fragmentShader
          .replace("#include <common>", "#include <common>\nvarying float vAlt;\nuniform float uBase;")
          .replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.a *= smoothstep(uBase, uBase + 0.7, vAlt);");
      });
      return m;
    };
    const facetaPorcelana = porcelana();
    facetaPorcelana.transparent = true;
    facetaPorcelana.sheen = 0.18;
    const facetaEsmalte = esmT2();
    const vao = new THREE.MeshBasicMaterial({ map: texturaDaLupa(), transparent: true, depthTest: false, toneMapped: false });
    // a lupa: os mesmos materiais (esmalte marfim, porcelana perolada), cortados no plano
    const corta = <T extends THREE.Material>(m: T) => {
      m.clippingPlanes = [plano];
      return m;
    };
    return {
      esm: esmT2(),
      gengiva: gengivaQueSome("toda", { y: [3.8, 7.4], r: [19.6, 23.2], centroZ: 0, porX: true }),
      facetaPorcelana,
      facetaEsmalte,
      dentina: camada(DENTINA, 0.9, true),
      esmalteCamada: camada(ESMALTE_SEPARADO, 0.3),
      borda: camada("#cfe1ec", 0.22),
      plaquetas: TONS.map((t) => new THREE.MeshPhysicalMaterial({ color: t, roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.2, transparent: true })),
      suporte: new THREE.MeshStandardMaterial({ color: "#a39b8a", roughness: 0.55, transparent: true }),
      vao: [vao, vao.clone()],
      lupa: {
        dente: corta(esmT2()),
        faceta: (() => {
          const m = corta(porcelana());
          m.polygonOffset = true;
          m.polygonOffsetFactor = -1;
          m.polygonOffsetUnits = -1;
          return m;
        })(),
      },
    };
  }, [plano]);

  // o desenho do corte depende do perfil (vem da oficina)
  const corte = useMemo(() => {
    const g = uma(formas, "lupaPerfil");
    const c = uma(formas, "lupaContorno");
    if (!g || !c) return null;
    const perfil = g.attributes.position.array as Float32Array;
    const contorno = c.attributes.position.array as Float32Array;
    return {
      dente: materialDoCorteDoDente(perfil, contorno, plano, "dente"),
      faceta: materialDoCorteDoDente(perfil, contorno, plano, "faceta"),
    };
  }, [formas, plano]);

  // a medida: as divisas entre os dentes, na frente, logo abaixo das bordas (no espaço da arcada, coroa
  // para cima: a cena vira o grupo)
  const medida = useMemo(() => {
    const fila = [...vagas].sort((a, b) => a.pos.x - b.pos.x);
    const meia = (i: number) => (fila[i].forma.largura / 2) * Math.cos(fila[i].giro);
    const xs = [fila[0].pos.x - meia(0)];
    for (let i = 0; i < fila.length - 1; i++) xs.push((fila[i].pos.x + meia(i) + fila[i + 1].pos.x - meia(i + 1)) / 2);
    xs.push(fila[fila.length - 1].pos.x + meia(fila.length - 1));
    const y = FORMAS.central.altura + 2.4;
    const z = 7.5;
    return {
      linha: [
        [xs[0], y, z],
        [xs[xs.length - 1], y, z],
      ] as [number, number, number][],
      tracos: xs.flatMap((x) => [
        [x, y - 0.9, z],
        [x, y + 0.9, z],
      ]) as [number, number, number][],
    };
  }, [vagas]);

  const facetas = useRef<(THREE.Mesh | null)[]>([]);
  const centralEscuro = useRef<THREE.Mesh>(null);
  const lateralCurto = useRef<THREE.Mesh>(null);
  const camadas = useRef<(THREE.Mesh | null)[]>([]);
  const dentinaGrupos = useRef<(THREE.Group | null)[]>([]);
  const escala = useRef<THREE.Group>(null);
  const plaquetas = useRef<(THREE.Mesh | null)[]>([]);
  const medidaGrupo = useRef<THREE.Group>(null);
  const medidaLinhas = useRef<(Linha2 | null)[]>([]);
  const lupa1 = useRef<THREE.Group>(null);
  const lupa2 = useRef<THREE.Group>(null);
  const disco1 = useRef<THREE.MeshBasicMaterial>(null);
  const disco2 = useRef<THREE.MeshBasicMaterial>(null);
  const facetaLupa = useRef<THREE.Group>(null);
  const camLupa = useRef<THREE.PerspectiveCamera>(null);
  // cada lupa só desenha a cena dela enquanto aparece
  const [ligadas, setLigadas] = useState([false, false]);
  // quantos quadros cada lupa já desenhou ligada (o disco só aparece com a cena dela pronta)
  const quentes = useRef([0, 0]);

  useFrame((estado) => {
    if (!formas) return;
    const p = fixo ?? FILMES.estetica.p;
    // 1) a medida cresce do meio para os lados e sai
    const m = sobe(p, P.medida[0], P.medida[1]);
    const mVis = janela(p, P.medida[0], P.medida[0] + 0.02, P.medida[2], P.medida[3]);
    if (medidaGrupo.current) {
      medidaGrupo.current.scale.x = Math.max(0.001, m);
      medidaGrupo.current.visible = mVis > 0.002;
    }
    medidaLinhas.current.forEach((l) => {
      if (l) (l.material as THREE.Material).opacity = mVis;
    });
    // a escala de cor sobe, a plaqueta que combina se destaca, e ela sai
    const e = janela(p, P.escala[0], P.escala[1], P.escala[2], P.escala[3]);
    if (escala.current) {
      escala.current.visible = e > 0.002;
      escala.current.position.y = FORMAS.central.altura + 7.2 + 9 * (1 - e);
    }
    const destaque = sobe(p, P.escala[1], P.escala[1] + 0.03);
    plaquetas.current.forEach((pl, i) => {
      if (!pl) return;
      pl.position.y = i === COMBINA ? -2.4 * destaque : 0;
      mat.plaquetas[i].opacity = e * (i === COMBINA ? 1 : 1 - 0.5 * destaque);
    });
    mat.suporte.opacity = e;
    // 2) a faceta vem da frente e assenta; assentada, toma o grão e o tom dos vizinhos
    const f = sobe(p, P.faceta[0], P.faceta[1]);
    const ig = sobe(p, P.facetaIguala[0], P.facetaIguala[1]);
    // e encolhe para a medida do central natural; o dente escuro encolhe junto, para a borda da faceta seguir
    // cobrindo a dele (senão ele aparece na lateral e embaixo da borda)
    const medidaFinal = [mix(1, 0.945, ig), mix(1, 0.972, ig), 1] as const;
    facetas.current.forEach((fc) => {
      if (!fc) return;
      fc.position.z = 16 * (1 - f);
      fc.scale.set(...medidaFinal);
    });
    centralEscuro.current?.scale.set(...medidaFinal);
    // na troca, o esmalte entra opaco por baixo e a porcelana sai por cima (duas camadas pela metade deixavam
    // ver o dente escuro)
    mat.facetaPorcelana.opacity = trecho(p, P.faceta[0], P.faceta[0] + 0.04) * (1 - ig);
    if (facetas.current[0]) facetas.current[0].visible = p > P.faceta[0] && ig < 1;
    if (facetas.current[1]) facetas.current[1].visible = ig > 0;
    // as lupas: aparecem, a faceta da seção desliza junto, e somem
    const l1 = janela(p, P.lupa[0], P.lupa[1], P.lupa[2], P.lupa[3]);
    const l2 = janela(p, P.lupa2[0], P.lupa2[1], P.lupa2[2], P.lupa2[3]);
    // cada lupa liga um pouco antes de aparecer (a cena dela já está desenhada quando o disco surge) e só
    // aparece depois de dois quadros ligada: num salto da rolagem, o disco não mostra a textura ainda vazia
    // (antes de a cena estar preparada, nenhuma liga: desenhar agora pararia a página)
    const precisa = [preparada && p > P.lupa[0] - 0.05 && p < P.lupa[3] + 0.01, preparada && p > P.lupa2[0] - 0.05 && p < P.lupa2[3] + 0.01];
    if (precisa[0] !== ligadas[0] || precisa[1] !== ligadas[1]) setLigadas(precisa);
    let falta = false;
    (
      [
        [lupa1, disco1, l1],
        [lupa2, disco2, l2],
      ] as const
    ).forEach(([g, d, janelaDaLupa], i) => {
      quentes.current[i] = precisa[i] && ligadas[i] ? quentes.current[i] + 1 : 0;
      const pronta = quentes.current[i] >= 2;
      if (janelaDaLupa > 0.002 && !pronta) falta = true;
      const l = pronta ? janelaDaLupa : 0;
      if (g.current) {
        g.current.visible = l > 0.002;
        g.current.scale.setScalar(0.9 + 0.1 * l);
      }
      if (d.current) d.current.opacity = l;
      mat.vao[i].opacity = l;
    });
    // a tela só desenha quando pedem: enquanto uma lupa espera a cena dela, mais um quadro
    if (falta) estado.invalidate();
    if (facetaLupa.current) facetaLupa.current.position.z = 9 * (1 - f);
    if (camLupa.current && corte) {
      camLupa.current.getWorldPosition(corte.dente.uniforms.uCam.value);
      corte.faceta.uniforms.uCam.value.copy(corte.dente.uniforms.uCam.value);
    }
    // 3) as camadas do lateral: a dentina cresce a partir da borda curta, o esmalte cobre, a borda translúcida
    // fecha; no fim, as três ficam com a cor do dente
    const dn = sobe(p, P.dentina[0], P.dentina[1]);
    const es = sobe(p, P.esmalte[0], P.esmalte[1]);
    const bo = sobe(p, P.borda[0], P.borda[1]);
    const igc = sobe(p, P.iguala[0], P.iguala[1]);
    dentinaGrupos.current.forEach((g) => {
      if (g) g.scale.y = 0.2 + 0.8 * dn;
    });
    mat.dentina.opacity = trecho(p, P.dentina[0], P.dentina[0] + 0.02);
    mat.esmalteCamada.opacity = mix(0, 0.9, es) + 0.1 * igc;
    mat.borda.opacity = 0.72 * bo * (1 - igc);
    mat.esmalteCamada.color.set(ESMALTE_SEPARADO).lerp(new THREE.Color("#ffffff"), igc);
    // no último quadro, iguais, o curto e as camadas dão lugar ao lateral inteiro (sem a emenda da faixa)
    const inteiro = p >= 0.985;
    camadas.current.forEach((c, i) => {
      if (!c) return;
      const o = [mat.dentina.opacity, mat.esmalteCamada.opacity, mat.borda.opacity][i % 3];
      c.visible = o > 0.003 && !inteiro;
    });
    if (lateralCurto.current) lateralCurto.current.geometry = inteiro ? uma(formas, "lateralInteiro")! : varias(formas, "dentes")[vagas.indexOf(curto)];
  });

  // o sorriso (gengiva, dentes, faceta e camadas); a lupa da direita desenha o mesmo, de perto (k = 1)
  const pose = (v: (typeof vagas)[number]) => ({ position: v.pos, rotation: [0, v.giro, 0] as [number, number, number] });
  const sorriso = (k: number) =>
    formas ? (
      <group rotation={[0, 0, Math.PI]}>
        <mesh geometry={uma(formas, "gengiva")!} material={mat.gengiva} />
        {vagas.map((v, i) => (
          <group key={i} {...pose(v)}>
            <mesh
              ref={k !== 0 ? undefined : v === curto ? lateralCurto : v === escuro ? centralEscuro : undefined}
              geometry={varias(formas, "dentes")[i]}
              material={mat.esm}
            />
          </group>
        ))}
        {/* a faceta, na frente do central escuro: porcelana na chegada, esmalte quando assenta */}
        {k === 0 ? (
          <group {...pose(escuro)}>
            {[mat.facetaPorcelana, mat.facetaEsmalte].map((m, j) => (
              <mesh
                key={j}
                ref={(el) => {
                  facetas.current[j] = el;
                }}
                geometry={uma(formas, "faceta")!}
                material={m}
                visible={false}
              />
            ))}
          </group>
        ) : null}
        {/* as camadas do lateral curto */}
        <group {...pose(curto)}>
          <group
            ref={(el) => {
              dentinaGrupos.current[k] = el;
            }}
            position={[0, Y_CAMADAS, 0]}
          >
            <mesh
              ref={(el) => {
                camadas.current[k * 3] = el;
              }}
              geometry={varias(formas, "camadas")[0]}
              material={mat.dentina}
              position={[0, -Y_CAMADAS, 0]}
              visible={false}
            />
          </group>
          {[1, 2].map((c) => (
            <mesh
              key={c}
              ref={(el) => {
                camadas.current[k * 3 + c] = el;
              }}
              geometry={varias(formas, "camadas")[c]}
              material={c === 1 ? mat.esmalteCamada : mat.borda}
              visible={false}
              renderOrder={c}
            />
          ))}
        </group>
      </group>
    ) : null;

  // a lupa da esquerda: o central escuro cortado ao meio (fica a metade de x >= 0, com a coroa para baixo),
  // visto do lado do corte e girado uns 20° para a frente aparecer
  const cenaLupaCorte =
    formas && corte ? (
      <>
        <PerspectiveCamera ref={camLupa} makeDefault fov={22} near={1} far={200} position={[-33, -5.2, 12]} onUpdate={(c) => c.lookAt(0, -5.6, 0.6)} />
        <color attach="background" args={["#e8e2d6"]} />
        <Ambiente parede={null} rebatida={0.5} sol={[-50, 30, 40]} />
        <group rotation={[0, 0, Math.PI]}>
          <mesh geometry={uma(formas, "lupaDente")!} material={mat.lupa.dente} />
          <mesh geometry={uma(formas, "lupaDente")!} material={corte.dente} />
          <group ref={facetaLupa}>
            <mesh geometry={uma(formas, "lupaFaceta")!} material={mat.lupa.faceta} />
            <mesh geometry={uma(formas, "lupaFaceta")!} material={corte.faceta} />
          </group>
        </group>
        <Preparo naTextura />
      </>
    ) : null;

  // a lupa da direita: a ponta do lateral curto de perto (no mundo, a arcada é virada: o x troca de sinal)
  const lx = -curto.pos.x;
  const cenaLupaCamadas = formas ? (
    <>
      <PerspectiveCamera makeDefault fov={22} near={1} far={300} position={[lx * 1.01, -7.1, curto.pos.z + 40]} onUpdate={(c) => c.lookAt(lx, -6.4, curto.pos.z)} />
      <color attach="background" args={["#e8e2d6"]} />
      <Ambiente parede={null} rebatida={0.5} />
      {sorriso(1)}
      <Preparo naTextura />
    </>
  ) : null;

  // de frente, na altura das bordas (um pouco acima)
  const camera = (
    <PerspectiveCamera makeDefault fov={22} near={1} far={600} position={[0, 1, 128]} onUpdate={(c) => c.lookAt(0, -7.5, -6)}>
      <Lupa grupo={lupa1} disco={disco1} vao={mat.vao[0]} posicao={[-0.9, -2.25, -20]} raio={1.48} ligada={ligadas[0]}>
        {cenaLupaCorte}
      </Lupa>
      <Lupa grupo={lupa2} disco={disco2} vao={mat.vao[1]} posicao={[1.75, -2.25, -20]} raio={1.48} ligada={ligadas[1]}>
        {cenaLupaCamadas}
      </Lupa>
    </PerspectiveCamera>
  );
  const ambiente = <Ambiente alcance={34} parede={null} rebatida={0.5} />;
  if (!formas) return <>{camera}{ambiente}</>;

  return (
    <>
      {camera}
      {ambiente}
      {sorriso(0)}
      <group rotation={[0, 0, Math.PI]}>
        {/* a medida (as larguras) e a escala de cor, na frente e abaixo das bordas */}
        <group ref={medidaGrupo} visible={false}>
          <Line
            ref={(el) => {
              medidaLinhas.current[0] = el;
            }}
            points={medida.linha}
            color="#9b8052"
            lineWidth={1.6}
            transparent
          />
          <Line
            ref={(el) => {
              medidaLinhas.current[1] = el;
            }}
            points={medida.tracos}
            segments
            color="#9b8052"
            lineWidth={1.6}
            transparent
          />
        </group>
        <group ref={escala} position={[0, FORMAS.central.altura + 16, 9]} visible={false}>
          <mesh position={[0, -0.7, 0]} material={mat.suporte}>
            <boxGeometry args={[TONS.length * 5.2 + 1.2, 0.8, 1.2]} />
          </mesh>
          {TONS.map((_, i) => (
            <mesh
              key={i}
              ref={(el) => {
                plaquetas.current[i] = el;
              }}
              geometry={uma(formas, "plaqueta")!}
              material={mat.plaquetas[i]}
              position={[(i - (TONS.length - 1) / 2) * 5.2, 0, 0]}
              scale={0.62}
            />
          ))}
        </group>
      </group>
      <Preparo id="estetica" />
    </>
  );
}
