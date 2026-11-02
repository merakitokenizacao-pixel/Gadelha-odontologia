"use client";

import { PerspectiveCamera, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Ambiente } from "../Ambiente";
import { encadeia } from "../corte";
import { FILMES, mix, sobe, trecho } from "../filme";
import { esmalte, gengiva } from "../materiais";
import { tortoDe, vagasTecnologia } from "../oficina/tecnologia";
import { uma, useFormas, varias } from "../oficina/usaFormas";

// T5 · O planejamento digital, nos cartões do painel azul. Laços curtos, que tocam só depois que a linha
// de luz do painel passa pelo cartão e enquanto ele está à vista.
// 1) Escaneamento: a ponteira do escâner aparece sobre o último molar e passa pela arcada de hoje (os
//    dentes tortos); na linha de luz que ela deixa, o esmalte vira o modelo digital (triângulos em areia).
// 2) Simulação: de perto, o modelo anda em quatro etapas da posição de hoje à planejada (a régua do cartão
//    marca as etapas: é o plano, não um antes e depois).
// 3) A impressão não tem 3D: o cartão é a foto da impressora da clínica, com os modelos impressos presos à
//    plataforma (a prova de "a impressora fica aqui"); a impressora feita em 3D lia como maquete.

const LUZ = new THREE.Color("#fff6de"); // a mesma luz quente da linha do painel
const FUNDO_CARTAO = new THREE.Color("#22274d"); // a cor do cartão sobre o painel
const vec = (c: THREE.Color, k = 1) => {
  const t = { r: 0, g: 0, b: 0 };
  c.getRGB(t, THREE.SRGBColorSpace);
  return `vec3(${(t.r * k).toFixed(3)}, ${(t.g * k).toFixed(3)}, ${(t.b * k).toFixed(3)})`;
};

// O esmaecimento pela cor: o modelo vai para a cor do cartão. Sem transparência, o lado de dentro nunca
// aparece e nada fica pontilhado. Vem antes dos outros encadeamentos, para a mistura ser a última conta.
function esmaece<T extends THREE.Material>(m: T, quanto: { value: number }) {
  encadeia(m, "esmaece", (sh) => {
    sh.uniforms.uSome = quanto;
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uSome;")
      .replace("#include <dithering_fragment>", `#include <dithering_fragment>\n  gl_FragColor.rgb = mix(gl_FragColor.rgb, ${vec(FUNDO_CARTAO)}, uSome);`);
  });
  return m;
}

// o modelo digital: areia fosca e facetada, com as arestas dos triângulos desenhadas na própria superfície
// (só as da frente, sem linhas soltas), a 40%
function materialMalha(cor: string, quanto: { value: number }) {
  const m = esmaece(new THREE.MeshStandardMaterial({ color: cor, roughness: 0.82, metalness: 0, flatShading: true }), quanto);
  encadeia(m, "malha", (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 aBary;\nvarying vec3 vBary;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBary = aBary;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vBary;").replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>
  vec3 passo = fwidth(vBary);
  vec3 dentro = smoothstep(vec3(0.0), passo * 1.15, vBary);
  float aresta = 1.0 - min(min(dentro.x, dentro.y), dentro.z);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.36, 0.32, 0.25), aresta * 0.42);`,
    );
  });
  return m;
}

// A linha de luz do escâner: onde o plano corta, uma faixa fina (~0,3 mm) na luz quente, só nos dentes e
// na crista da gengiva (na parede da gengiva, ela descia como uma cortina). O lado de dentro das peças
// cortadas sai num tom próprio, mais fundo (era um rasgo escuro na emenda; na luz quente, virava uma faixa
// creme até embaixo).
function comFaixa<T extends THREE.Material>(m: T, corte: { value: number }, dentro: string) {
  m.side = THREE.DoubleSide;
  encadeia(m, "faixa", (sh) => {
    sh.uniforms.uCorte = corte;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vMundoF;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvMundoF = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vMundoF;\nuniform float uCorte;").replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>
  if (!gl_FrontFacing) gl_FragColor.rgb = ${vec(new THREE.Color(dentro))};
  float dx = abs(vMundoF.x - uCorte);
  float noAlto = smoothstep(-0.5, 1.5, vMundoF.y);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, ${vec(LUZ)}, 0.9 * noAlto * (1.0 - smoothstep(0.08, 0.2, dx)));
  gl_FragColor.rgb += vec3(0.09, 0.07, 0.04) * noAlto * (1.0 - smoothstep(0.2, 1.1, dx));`,
    );
  });
  return m;
}

// a pose de hoje de cada dente (torto), a partir da vaga na arcada
const poseTorta = (v: ReturnType<typeof vagasTecnologia>[number]) => {
  const [giro, fora] = tortoDe(v);
  return { position: [v.pos.x + v.normal.x * fora, 0, v.pos.z + v.normal.z * fora] as [number, number, number], rotation: [0, v.giro + giro, 0] as [number, number, number] };
};

const K_ARCADA = 0.052; // a mesma parábola da arcada (z = -k·x²)

// ---------- 1) escaneamento ----------
export function CenaEscaneamento({ p: fixo }: { p?: number }) {
  const formas = useFormas("tec-escaneamento", "escaneamento");
  const vagas = useMemo(vagasTecnologia, []);
  // os dois lados do corte: à frente do escâner o esmalte (x > corte), atrás dele o modelo digital
  const plano = useMemo(() => ({ esmalte: new THREE.Plane(new THREE.Vector3(1, 0, 0), 40), malha: new THREE.Plane(new THREE.Vector3(-1, 0, 0), -40) }), []);
  const corte = useMemo(() => ({ value: -40 }), []);
  // quanto cada lado já foi para a cor do cartão (o laço recomeça: a malha some, o esmalte volta)
  const some = useMemo(() => ({ esmalte: { value: 0 }, malha: { value: 0 } }), []);
  const mat = useMemo(() => {
    const e = comFaixa(esmaece(esmalte(true), some.esmalte), corte, "#d8c6a2");
    const g = comFaixa(esmaece(gengiva(), some.esmalte), corte, "#a7716d");
    const m = comFaixa(materialMalha("#d9cfb3", some.malha), corte, "#b4a684");
    e.clippingPlanes = [plano.esmalte];
    g.clippingPlanes = [plano.esmalte];
    m.clippingPlanes = [plano.malha];
    // a ponteira: plástico branco acetinado e a janela de vidro escuro
    const casco = new THREE.MeshPhysicalMaterial({ color: "#f1efe9", roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.35, sheen: 0.3, sheenColor: new THREE.Color("#ffffff") });
    const vidro = new THREE.MeshPhysicalMaterial({ color: "#1c2330", roughness: 0.08, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
    return { esmalte: e, gengiva: g, malha: m, casco, vidro };
  }, [plano, corte, some]);
  // a luz da janela: um cone estreito sobre o dente da vez
  const janela = useMemo(() => {
    const s = new THREE.SpotLight(LUZ, 2.6, 0, 0.3, 0.6, 0);
    s.position.set(0, -1.2, 0);
    s.target.position.set(0, -12, 0);
    return s;
  }, []);
  const escaner = useRef<THREE.Group>(null);

  useFrame(() => {
    const p = fixo ?? FILMES.escaneamento.p;
    // o corte passa a arcada inteira, até o fim da gengiva (parando antes, sobrava uma lasca do modelo sólido)
    const xs = mix(-36, 36, sobe(p, 0.08, 0.82));
    // a ponteira entra pela borda esquerda do cartão, na altura do último molar (longe dos cantos), passa pela
    // arcada e sai pela borda direita
    const entra = 1 - sobe(p, 0, 0.07);
    const sai = sobe(p, 0.84, 0.92);
    // onde está o corte: antes da passada, tudo esmalte; depois, tudo malha; no fim do laço, a malha some
    // e o esmalte volta (sem corte seco)
    let c = xs;
    if (p < 0.08) c = -40;
    else if (p >= 0.82) c = p < 0.975 ? 40 : -40;
    corte.value = c;
    plano.esmalte.constant = -c;
    plano.malha.constant = c;
    some.malha.value = trecho(p, 0.95, 0.975);
    some.esmalte.value = p >= 0.975 ? 1 - trecho(p, 0.975, 1) : 0;
    if (escaner.current) {
      // a ponteira não passa do último molar (≈ ±24): a linha de luz termina sozinha a ponta da gengiva
      const xe = Math.max(-25, Math.min(25, xs));
      escaner.current.visible = p > 0 && p < 0.92;
      escaner.current.position.set(xe - 48 * entra + 48 * sai, 13.2, -K_ARCADA * xe * xe);
      escaner.current.rotation.set(0, 0.4 * Math.atan(2 * K_ARCADA * xe), 0);
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault fov={30} near={1} far={800} position={[0, 112, 86]} onUpdate={(c) => c.lookAt(0, 0, -14)} />
      <Ambiente parede={null} luz={0.9} />
      {formas ? (
        <group position={[0, 0, 8]}>
          <mesh geometry={uma(formas, "gengiva")!} material={mat.gengiva} />
          <mesh geometry={uma(formas, "gengivaMalha")!} material={mat.malha} />
          {vagas.map((v, i) => (
            <group key={i} {...poseTorta(v)}>
              <mesh geometry={varias(formas, "dentes")[i]} material={mat.esmalte} />
              <mesh geometry={varias(formas, "malhas")[i]} material={mat.malha} />
            </group>
          ))}
          {/* a ponteira do escâner: a cabeça fina, inclinada uns 20°, com a janela embaixo da ponta, e o corpo
              que engrossa saindo para fora da arcada */}
          <group ref={escaner} visible={false}>
            <group rotation={[-0.35, 0, 0]}>
              <RoundedBox args={[4.6, 2, 12]} radius={0.9} smoothness={4} position={[0, 0, 4]} material={mat.casco} />
              <mesh position={[0, -1.02, 0]} material={mat.vidro}>
                <boxGeometry args={[3, 0.1, 4.2]} />
              </mesh>
              <mesh position={[0, 6.6, 20.6]} rotation={[1.1, 0, 0]} material={mat.casco}>
                <cylinderGeometry args={[2.8, 1.8, 24, 28]} />
              </mesh>
              <primitive object={janela} />
              <primitive object={janela.target} />
            </group>
          </group>
        </group>
      ) : null}
    </>
  );
}

// ---------- 2) simulação ----------
export function CenaSimulacao({ p: fixo }: { p?: number }) {
  const formas = useFormas("tec-simulacao", "simulacao");
  const vagas = useMemo(vagasTecnologia, []);
  // dois tons, como nos programas de planejamento: os dentes mais claros, a gengiva mais escura
  const some = useMemo(() => ({ value: 1 }), []);
  const mat = useMemo(() => ({ dente: materialMalha("#eadfc4", some), gengiva: materialMalha("#b7a27c", some) }), [some]);
  // a gengiva de hoje vira a do plano junto com os dentes (a mesma malha, com a forma final de alvo)
  const gengivaMalha = useMemo(() => {
    const torta = uma(formas, "gengivaTorta");
    const certa = uma(formas, "gengivaCerta");
    if (!torta || !certa) return null;
    torta.morphAttributes.position = [certa.attributes.position];
    return torta;
  }, [formas]);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const gengivaRef = useRef<THREE.Mesh>(null);
  const etapa = useRef(-1);

  useFrame(() => {
    const p = fixo ?? FILMES.simulacao.p;
    // quatro etapas: cada uma anda um quarto e para um instante
    const passos = 4;
    const t = trecho(p, 0.06, 0.86) * passos;
    const k = Math.min(passos, Math.floor(t));
    const u = Math.min(1, (k + sobe(t - k, 0, 0.55)) / passos);
    vagas.forEach((v, i) => {
      const g = refs.current[i];
      if (!g) return;
      const [giro, fora] = tortoDe(v);
      const f = fora * (1 - u);
      g.position.set(v.pos.x + v.normal.x * f, 0, v.pos.z + v.normal.z * f);
      g.rotation.y = v.giro + giro * (1 - u);
    });
    const gm = gengivaRef.current;
    if (gm?.morphTargetInfluences) gm.morphTargetInfluences[0] = u;
    // o laço recomeça sem corte seco: o modelo some no planejado e volta no de hoje
    some.value = 1 - trecho(p, 0, 0.04) * (1 - trecho(p, 0.95, 1));
    // a régua do cartão: o ponto anda com as etapas e para em cada número
    const cartao = document.querySelector<HTMLElement>('[data-laco="simulacao"]');
    if (cartao) {
      cartao.style.setProperty("--p", (u * (1 - trecho(p, 0.95, 1))).toFixed(3));
      const chegou = p >= 0.95 ? 0 : Math.min(passos, Math.floor(u * passos + 1e-4));
      if (chegou !== etapa.current) {
        etapa.current = chegou;
        cartao.dataset.etapa = String(chegou);
      }
    }
  });

  return (
    <>
      {/* de perto e de frente, uns 30° acima das bordas: de canino a canino, com os pré-molares (o cartão 1
          mostra a arcada inteira de cima) */}
      <PerspectiveCamera makeDefault fov={38} near={1} far={800} position={[0, 45.4, 84.2]} onUpdate={(c) => c.lookAt(0, 6, -6)} />
      <Ambiente parede={null} luz={0.9} />
      {formas && gengivaMalha ? (
        <group position={[0, 0, 8]}>
          <mesh
            ref={(el) => {
              gengivaRef.current = el;
              el?.updateMorphTargets();
            }}
            geometry={gengivaMalha}
            material={mat.gengiva}
          />
          {vagas.map((v, i) => (
            <group
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              {...poseTorta(v)}
            >
              <mesh geometry={varias(formas, "malhas")[i]} material={mat.dente} />
            </group>
          ))}
        </group>
      ) : null}
    </>
  );
}
