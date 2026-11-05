"use client";

import { Line, PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { type ComponentRef, useMemo, useRef } from "react";
import * as THREE from "three";
import { Ambiente } from "../Ambiente";
import { encadeia, gengivaQueSome, type SomeGengiva } from "../corte";
import { FILMES, sobe, trecho } from "../filme";
import { alinhador, esmalte } from "../materiais";
import { poseOrto, vagasOrto } from "../oficina/orto";
import { uma, useFormas, varias } from "../oficina/usaFormas";
import { Preparo } from "../Preparo";

// T1 · Ortodontia. A arcada de cima, de pré-molar a pré-molar, vista de frente e de baixo (uns 30° abaixo
// das bordas), como quem olha o sorriso.
// 1) o plano: uma linha fina de areia marca onde cada borda deve chegar;
// 2) o primeiro alinhador (uma peça só, transparente) sobe e encaixa; antes de encostar, os dentes já
//    andaram o trecho dele (ninguém atravessa a parede); a linha some quando ele encaixa;
// 3) troca de alinhador, etapa por etapa, até o fim do plano. A sombra da arcada na parede começa
//    irregular e termina numa curva lisa.

// cada alinhador: [começa a subir, encaixa, começa a sair, saiu]. A troca é em sequência: a placa velha desce
// e some; depois a nova sobe sozinha, a 35% o tempo todo. Os dentes andam o trecho da etapa quando nenhuma
// placa está encostada (a que sai já passou de 11 mm, a que chega ainda não chegou a 11 mm).
const BANDEJAS = [
  { janela: [0.3, 0.42, 0.62, 0.67], anda: [0.3, 0.34] },
  { janela: [0.68, 0.78, 0.82, 0.86], anda: [0.655, 0.715] },
  { janela: [0.86, 0.94, 0.97, 1.0], anda: [0.845, 0.885] },
] as const;
const LONGE = 16; // de onde o alinhador vem (mm, por baixo)
type Linha2 = ComponentRef<typeof Line>;
// no laboratório, a placa pintada pelas normais (para achar dobras na malha)
const NORMAIS = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });

// a gengiva em duas partes: a que fica (opaca: aparece através do alinhador) e a que some no fundo da
// página (transparente), em cima e nas pontas da arcada
const SOME_ORTO: SomeGengiva = { y: [6.2, 9.0], r: [34.0, 38.0], centroZ: -8 };

export function CenaOrtodontia({ p: fixo, vista }: { p?: number; vista?: "oclusal" | "semgengiva" | "bandeja" }) {
  const formas = useFormas("orto");
  const vagas = useMemo(vagasOrto, []);
  const barato = useMemo(() => typeof window !== "undefined" && matchMedia("(max-width: 899px), (pointer: coarse)").matches, []);
  const mat = useMemo(
    () => ({
      esm: esmalte(),
      fica: gengivaQueSome("fica", SOME_ORTO),
      some: gengivaQueSome("some", SOME_ORTO),
      // duas placas (na troca, a que sai e a que chega aparecem juntas)
      // a placa a 35% com a borda clara, também no computador: a refração deixava fios escuros nas dobras da
      // placa em volta do canino fora do lugar
      bandejas: [0, 1].map(() => {
        const m = alinhador(true);
        m.transparent = true;
        m.polygonOffset = true;
        m.polygonOffsetFactor = -2;
        m.polygonOffsetUnits = -2;
        // a borda do alinhador some no último milímetro (sem traço escuro sobre a gengiva)
        encadeia(m, "borda-some", (sh) => {
          sh.vertexShader = sh.vertexShader
            .replace("#include <common>", "#include <common>\nattribute float aBorda;\nvarying float vBorda;")
            .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBorda = aBorda;");
          sh.fragmentShader = sh.fragmentShader
            .replace("#include <common>", "#include <common>\nvarying float vBorda;")
            .replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.a *= smoothstep(-0.1, 0.9, vBorda);");
        });
        return m;
      }),
    }),
    [barato],
  );

  // a gengiva de hoje vira a do plano junto com os dentes (a mesma malha, com a forma final de alvo)
  const gTorta = uma(formas, "gengivaTorta");
  const gCerta = uma(formas, "gengivaCerta");
  if (gTorta && gCerta && !gTorta.morphAttributes.position) {
    gTorta.morphAttributes.position = [gCerta.attributes.position];
    gTorta.morphAttributes.normal = [gCerta.attributes.normal];
  }

  // a linha do plano, como anotação por cima dos dentes: cáqui com um contorno creme, largura fixa na tela
  const pontosLinha = useMemo(
    () =>
      varias(formas, "linha").map((g) => {
        const a = g.attributes.position.array as Float32Array;
        return Array.from({ length: a.length / 3 }, (_, i) => [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]] as [number, number, number]);
      }),
    [formas],
  );
  const larguraLinha = barato ? 2 : 2.8;

  const dentes = useRef<(THREE.Group | null)[]>([]);
  const gengivas = useRef<(THREE.Mesh | null)[]>([]);
  const bandejas = useRef<(THREE.Mesh | null)[]>([]);
  const linhas = useRef<(Linha2 | null)[]>([]);

  useFrame(() => {
    if (!formas) return;
    const p = fixo ?? FILMES.orto.p;
    // 1) a linha do plano, do meio para fora; some quando o primeiro alinhador encaixa
    const desenho = sobe(p, 0.06, 0.24);
    const some = 1 - trecho(p, 0.38, 0.42);
    linhas.current.forEach((l, i) => {
      if (!l) return;
      const total = pontosLinha[i >> 1]?.length ?? 1;
      (l.geometry as THREE.InstancedBufferGeometry).instanceCount = Math.max(0, Math.round((total - 1) * desenho));
      l.visible = desenho > 0 && some > 0;
      (l.material as THREE.Material).opacity = some;
    });
    // 2) os dentes: cada alinhador leva à etapa dele (o trecho é andado antes de ele encostar)
    const t = BANDEJAS.reduce((s, b) => s + sobe(p, b.anda[0], b.anda[1]) / BANDEJAS.length, 0);
    vagas.forEach((v, i) => {
      const g = dentes.current[i];
      if (!g) return;
      const { pos, rot } = poseOrto(v, t);
      g.position.copy(pos);
      g.rotation.copy(rot);
    });
    gengivas.current.forEach((m) => {
      if (m?.morphTargetInfluences) m.morphTargetInfluences[0] = t;
    });
    // 3) os alinhadores da vez: sobem, encaixam, ficam e saem (na troca, dois ao mesmo tempo)
    const ativos = BANDEJAS.map((b, k) => ({ b, k })).filter(({ b }) => p >= b.janela[0] && p <= b.janela[3]);
    bandejas.current.forEach((m, j) => {
      if (!m) return;
      const at = ativos[j];
      m.visible = !!at;
      if (!at) return;
      const [a0, a1, a2, a3] = at.b.janela;
      const longe = LONGE * (1 - sobe(p, a0, a1)) + LONGE * sobe(p, a2, a3);
      m.geometry = varias(formas, "alinhadores")[at.k];
      m.position.y = longe;
      // subindo, a 35% o tempo todo (só aparece num instante no começo); descendo, some
      mat.bandejas[j].opacity = 0.35 * trecho(p, a0, a0 + 0.012) * (1 - trecho(p, a2, a3));
    });
  });

  // de frente, uns 30° abaixo das bordas; no laboratório, também a vista de baixo (para conferir encostos)
  const alvo = new THREE.Vector3(0, -5, -10);
  const camera =
    vista === "oclusal" ? (
      <PerspectiveCamera makeDefault fov={30} near={1} far={800} position={[0, -150, -12]} up={[0, 0, -1]} onUpdate={(c) => c.lookAt(0, 0, -12)} />
    ) : (
      <PerspectiveCamera makeDefault fov={24} near={1} far={800} position={[0, -80, 120]} onUpdate={(c) => c.lookAt(alvo)} />
    );
  // a luz das outras cenas (o sol de cima à esquerda) e a rebatida de baixo, que clareia a borda dos
  // incisivos; sem sombra projetada: de baixo, a parede ficava longe demais e a sombra virava outra fileira
  const ambiente = <Ambiente alcance={36} parede={null} rebatida={0.55} />;
  if (!formas) return <>{camera}{ambiente}</>;

  return (
    <>
      {camera}
      {ambiente}
      {/* montada de coroa para cima e virada: as bordas para baixo */}
      <group rotation={[0, 0, Math.PI]}>
        {(vista === "semgengiva" || vista === "bandeja" ? [] : [mat.fica, mat.some]).map((m, i) => (
          <mesh
            key={i}
            ref={(e) => {
              gengivas.current[i] = e;
              if (e && !e.morphTargetInfluences) e.updateMorphTargets();
            }}
            geometry={gTorta!}
            material={m}
            receiveShadow
          />
        ))}
        {vagas.map((v, i) => (
          <group
            key={i}
            ref={(e) => {
              dentes.current[i] = e;
            }}
          >
            <mesh geometry={varias(formas, "dentes")[i]} material={mat.esm} visible={vista !== "bandeja"} />
          </group>
        ))}
        {pontosLinha.flatMap((pts, i) =>
          [
            { cor: "#f6f2ea", largura: larguraLinha + 2.4, ordem: 5 },
            { cor: "#9b8052", largura: larguraLinha, ordem: 6 },
          ].map((tr, j) => (
            <Line
              key={`${i}-${j}`}
              ref={(e) => {
                linhas.current[i * 2 + j] = e;
              }}
              points={pts}
              color={tr.cor}
              lineWidth={tr.largura}
              dashed
              dashSize={1.1}
              gapSize={0.75}
              transparent
              depthTest={false}
              renderOrder={tr.ordem}
            />
          )),
        )}
        {mat.bandejas.map((m, j) => (
          <mesh
            key={j}
            ref={(e) => {
              bandejas.current[j] = e;
            }}
            geometry={varias(formas, "alinhadores")[j]}
            material={vista === "bandeja" ? NORMAIS : m}
            visible={false}
            renderOrder={2}
          />
        ))}
      </group>
      <Preparo id="orto" />
    </>
  );
}
