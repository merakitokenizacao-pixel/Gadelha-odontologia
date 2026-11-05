"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Ambiente } from "../Ambiente";
import { desvaneceEmCima, desvaneceEmbaixo } from "../corte";
import { FILMES, janela, mix, sobe, trecho } from "../filme";
import { aco, esmalte, gengiva } from "../materiais";
import { filaProfilaxia } from "../oficina/formas";
import { uma, useFormas, varias } from "../oficina/usaFormas";
import { Preparo } from "../Preparo";

// T4 · Profilaxia e prevenção. Os seis dentes da frente de baixo, vistos de frente e um pouco de cima.
// 1) junto à gengiva, o tártaro (crostas ásperas, bege) e a película fosca da placa;
// 2) a ponta do ultrassom passa rente à gengiva: o tártaro se parte em lascas que caem e somem, com uma
//    névoa fina de água (no máximo 150 gotas);
// 3) a taça de polimento gira sobre cada dente: o esmalte passa de fosco a brilhante, e a luz principal
//    corre pelos dentes;
// 4) o tempo passa pela luz: três passagens rápidas (como dias) e a etiqueta "6 meses"; a placa volta
//    fraca e é tirada de novo (a revisão).

const P_LIMPA: [number, number] = [0.14, 0.4]; // ultrassom, da esquerda para a direita
const P_POLE: [number, number] = [0.44, 0.66]; // taça, da esquerda para a direita
const P_DIAS: [number, number] = [0.72, 0.88];
const P_REVISAO: [number, number] = [0.9, 0.98];

type Crosta = { pos: THREE.Vector3; escala: THREE.Vector3; giro: number; ordem: number; lado: number; lascas: { v: THREE.Vector3; g: THREE.Vector3 }[] };

function textura(): THREE.Texture {
  // gota da névoa: um ponto macio
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d")!;
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,0.9)");
  gr.addColorStop(0.4, "rgba(255,255,255,0.35)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function CenaProfilaxia({ p: fixo }: { p?: number }) {
  // as formas vêm da oficina (worker); a fila (posições) é calculada aqui mesmo
  const formas = useFormas("profilaxia");
  const fila = useMemo(filaProfilaxia, []);
  const desv = useMemo(() => ({ y: new THREE.Vector2(-6.4, -4.6), x: new THREE.Vector2(15.5, 19.5) }), []);
  // as raízes continuam dentro da gengiva, mas não descem até onde ela se desfaz
  const corteRaiz = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 3.6), []);

  // cada dente tem o próprio esmalte (fica brilhante quando a taça passa)
  const mat = useMemo(() => {
    const esm = fila.map(
      () => {
        const m = desvaneceEmbaixo(esmalte(), desv);
        m.clippingPlanes = [corteRaiz];
        return m;
      },
    );
    return {
      esm,
      gengiva: desvaneceEmbaixo(gengiva(), desv),
      // a placa some num degradê no terço junto à gengiva (sem a linha dura de cima)
      placa: desvaneceEmCima(new THREE.MeshStandardMaterial({ color: "#ddd2a6", roughness: 0.9, transparent: true, opacity: 0.7, depthWrite: false }), 2.2, 4.4),
      // o tártaro: giz bege fosco, sem reflexo
      crosta: new THREE.MeshStandardMaterial({ vertexColors: true, color: "#ffffff", roughness: 1, metalness: 0, envMapIntensity: 0.25 }),
      lasca: new THREE.MeshStandardMaterial({ color: "#c9bc94", roughness: 1, metalness: 0, envMapIntensity: 0.25 }),
      aco: aco(),
      taca: new THREE.MeshPhysicalMaterial({ color: "#c9bfa6", roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color("#f4ecdc") }),
      gota: new THREE.PointsMaterial({ size: 0.9, map: textura(), transparent: true, depthWrite: false, opacity: 0.55, color: "#f4f7f8" }),
    };
  }, [fila, desv, corteRaiz]);

  // crostas de tártaro: duas ou três por dente, na face da frente junto à gengiva
  const crostas = useMemo<Crosta[]>(() => {
    const lista: Crosta[] = [];
    let s = 3;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    fila.forEach((v, ordem) => {
      // uma faixa contínua de crostas colada à margem, mais grossa entre os dentes
      const n = 11;
      for (let k = 0; k < n; k++) {
        const u = k / (n - 1) - 0.5;
        const a = (v.forma.largura / 2) * u * 1.7;
        const meio = 1 - Math.abs(u) * 2; // 1 no meio do dente, 0 nas bordas
        const pos = new THREE.Vector3(a, 1.85 + (1 - meio) * 1.35 + rnd() * 0.25, v.forma.espessura * 0.45 - Math.pow(Math.abs(u), 1.6) * 2.2);
        const r = 0.55 + rnd() * 0.25 + (1 - meio) * 0.45;
        lista.push({
          pos,
          escala: new THREE.Vector3(r * (1.25 + rnd() * 0.5), r * (0.36 + rnd() * 0.18), r * 0.26),
          giro: (rnd() - 0.5) * 0.5,
          ordem,
          lado: k,
          lascas: Array.from({ length: 3 }, () => ({
            v: new THREE.Vector3((rnd() - 0.5) * 3, 1 + rnd() * 2.5, 2 + rnd() * 3),
            g: new THREE.Vector3(rnd() * 4, rnd() * 4, rnd() * 4),
          })),
        });
      }
    });
    return lista;
  }, [fila]);

  const crostaRefs = useRef<(THREE.Mesh | null)[]>([]);
  const lascaRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ponta = useRef<THREE.Mesh>(null);
  const taca = useRef<THREE.Group>(null);
  const gotas = useRef<THREE.Points>(null);
  const luzQueCorre = useRef<THREE.DirectionalLight>(null);
  const sol = useRef<THREE.Group>(null);

  // névoa: 140 gotas, cada uma com uma fase própria em volta da ponta
  const nevoa = useMemo(() => {
    const n = 140;
    const pos = new Float32Array(n * 3);
    const fase = Array.from({ length: n }, (_, i) => ({ t: (i * 0.6180339) % 1, dir: new THREE.Vector3(Math.cos(i * 2.4), 0.6 + ((i * 0.37) % 1), Math.sin(i * 2.4) * 0.6 + 0.8) }));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return { g, fase, n };
  }, []);

  // posição de cada dente na fila (no mundo), para a ponta e a taça andarem por eles
  const centros = useMemo(() => fila.map((v) => v.pos.clone()), [fila]);
  const ondeNaFila = (u: number) => {
    // u de 0 a 1 percorre do primeiro ao último dente
    const f = u * (centros.length - 1);
    const i = Math.min(centros.length - 2, Math.floor(f));
    const t = f - i;
    return { pos: centros[i].clone().lerp(centros[i + 1], t), i, t, f };
  };

  const mexeu = useRef({ p: -1, quando: 0 });
  useFrame((estado) => {
    const p = fixo ?? FILMES.profilaxia.p;
    const tempo = estado.clock.elapsedTime;
    if (p !== mexeu.current.p) mexeu.current = { p, quando: tempo };
    const vivo = tempo - mexeu.current.quando < 2;
    // 1-2) o ultrassom passa e o tártaro sai em lascas
    const uL = trecho(p, P_LIMPA[0], P_LIMPA[1]);
    const limpando = p > P_LIMPA[0] - 0.02 && p < P_LIMPA[1] + 0.03;
    const onde = ondeNaFila(uL);
    if (ponta.current) {
      ponta.current.visible = limpando;
      const vg = fila[Math.round(onde.f)];
      ponta.current.position.set(onde.pos.x, 2.8, onde.pos.z + (vg?.forma.espessura ?? 6) * 0.5 + 0.2);
      ponta.current.rotation.set(-0.2, -0.35 + 0.7 * uL, 0.25);
    }
    crostas.forEach((c, k) => {
      const momento = P_LIMPA[0] + ((c.ordem + c.lado * 0.07) / (fila.length - 0.2)) * (P_LIMPA[1] - P_LIMPA[0]);
      const m = crostaRefs.current[k];
      if (m) m.visible = p < momento;
      const vida = trecho(p, momento, momento + 0.05);
      c.lascas.forEach((l, j) => {
        const ls = lascaRefs.current[k * 3 + j];
        if (!ls) return;
        ls.visible = vida > 0 && vida < 1;
        const v = fila[c.ordem];
        const base = c.pos.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), v.giro).add(v.pos);
        const t = vida * 1.6;
        ls.position.set(base.x + l.v.x * t, base.y + l.v.y * t - 9 * t * t, base.z + l.v.z * t);
        ls.rotation.set(l.g.x * t, l.g.y * t, l.g.z * t);
        ls.scale.setScalar(1 - vida * 0.8);
      });
    });
    // névoa em volta da ponta
    if (gotas.current) {
      gotas.current.visible = limpando && uL > 0 && uL < 1;
      const arr = nevoa.g.attributes.position.array as Float32Array;
      const origem = ponta.current?.position ?? new THREE.Vector3();
      nevoa.fase.forEach((f, i) => {
        const t = (f.t + tempo * 0.9) % 1;
        arr[i * 3] = origem.x + f.dir.x * t * 3.2;
        arr[i * 3 + 1] = origem.y + f.dir.y * t * 2.6 - t * t * 1.5;
        arr[i * 3 + 2] = origem.z + f.dir.z * t * 2.4;
      });
      nevoa.g.attributes.position.needsUpdate = true;
      mat.gota.opacity = 0.5 * janela(p, P_LIMPA[0], P_LIMPA[0] + 0.03, P_LIMPA[1] - 0.02, P_LIMPA[1] + 0.02);
    }
    // a placa: some com o ultrassom; volta fraca nos 6 meses; sai na revisão
    const tiraPlaca = trecho(p, P_LIMPA[0], P_LIMPA[1]);
    const volta = sobe(p, P_DIAS[0], P_DIAS[1]);
    const revisao = sobe(p, P_REVISAO[0], P_REVISAO[1]);
    mat.placa.opacity = 0.7 * (1 - tiraPlaca) + 0.42 * volta * (1 - revisao);
    mat.placa.visible = mat.placa.opacity > 0.01;
    // 3) a taça pole dente por dente: fosco → brilhante
    const uP = trecho(p, P_POLE[0], P_POLE[1]);
    const ondeP = ondeNaFila(uP);
    if (taca.current) {
      taca.current.visible = p > P_POLE[0] - 0.02 && p < P_POLE[1] + 0.02;
      const vg = fila[Math.round(ondeP.f)];
      taca.current.position.set(ondeP.pos.x, 4.4, ondeP.pos.z + (vg?.forma.espessura ?? 6) * 0.5 + 1.3);
      taca.current.rotation.set(Math.PI / 2 - 0.25, 0, 0);
      taca.current.children[0].rotation.y = tempo * 18;
    }
    mat.esm.forEach((m, i) => {
      const brilho = limita01(uP * (fila.length - 1) - i + 0.6) * (1 - 0.5 * volta * (1 - revisao)) + 0.5 * revisao * volta;
      m.roughness = mix(0.6, 0.22, brilho);
      m.clearcoat = mix(0.12, 0.34, brilho);
      m.clearcoatRoughness = mix(0.5, 0.26, brilho);
    });
    // a luz principal corre pelo esmalte durante o polimento
    if (luzQueCorre.current) {
      luzQueCorre.current.intensity = 1.4 * janela(p, P_POLE[0], P_POLE[0] + 0.03, P_POLE[1] - 0.02, P_POLE[1] + 0.02);
      luzQueCorre.current.position.set(mix(-40, 40, uP), 22, 40);
    }
    // a névoa e a taça giram pelo relógio: enquanto estão em cena (e a pessoa mexeu há pouco), mais um quadro
    if (vivo && (limpando || (p > P_POLE[0] - 0.02 && p < P_POLE[1] + 0.02))) estado.invalidate();
    // 4) o tempo passa pela luz: três passagens rápidas, como dias
    if (sol.current) {
      const d = trecho(p, P_DIAS[0], P_DIAS[1]) * 3;
      const ang = (d % 1) * Math.PI;
      const ativo = p > P_DIAS[0] && p < P_DIAS[1];
      sol.current.rotation.z = ativo ? -Math.PI / 2 + ang : 0;
      (sol.current.children[0] as THREE.DirectionalLight).intensity = ativo ? 1.2 * Math.sin(ang) : 0;
    }
  });

  if (!formas)
    return (
      <>
        <PerspectiveCamera makeDefault fov={20} near={1} far={500} position={[0, 32, 104]} onUpdate={(c) => c.lookAt(0, 3.2, -2)} />
      </>
    );

  return (
    <>
      <PerspectiveCamera makeDefault fov={20} near={1} far={500} position={[0, 32, 104]} onUpdate={(c) => c.lookAt(0, 3.2, -2)} />
      <Ambiente alcance={30} parede={-14} sombra={0.14} raio={22} centro={[2, 0]} />
      <directionalLight ref={luzQueCorre} intensity={0} color="#fffaf0" />
      <group ref={sol}>
        <directionalLight position={[0, 60, 30]} intensity={0} color="#fff3df" />
      </group>
      <group position={[0, 0, 4]}>
        <mesh geometry={uma(formas, "gengiva")!} material={mat.gengiva} receiveShadow />
        {fila.map((v, i) => (
          <group key={i} position={v.pos} rotation={[0, v.giro, 0]}>
            <mesh geometry={varias(formas, "dentes")[i]} material={mat.esm[i]} castShadow />
            {/* depois do esmalte: o esmalte também é transparente (some embaixo) e pintava por cima */}
            <mesh geometry={varias(formas, "placa")[i]} material={mat.placa} renderOrder={3} />
          </group>
        ))}
        {crostas.map((c, k) => {
          const v = fila[c.ordem];
          return (
            <group key={k} position={v.pos} rotation={[0, v.giro, 0]}>
              <mesh
                ref={(m) => {
                  crostaRefs.current[k] = m;
                }}
                geometry={varias(formas, "crostas")[k % 4]}
                material={mat.crosta}
                position={c.pos}
                scale={c.escala}
                rotation={[0, 0, c.giro]}
              />
            </group>
          );
        })}
        {crostas.flatMap((c, k) =>
          c.lascas.map((_, j) => (
            <mesh
              key={`${k}-${j}`}
              ref={(m) => {
                lascaRefs.current[k * 3 + j] = m;
              }}
              geometry={uma(formas, "lasca")!}
              material={mat.lasca}
              visible={false}
            />
          )),
        )}
        <mesh ref={ponta} geometry={uma(formas, "ponta")!} material={mat.aco} visible={false} castShadow />
        <points ref={gotas} geometry={nevoa.g} material={mat.gota} visible={false} />
        <group ref={taca} visible={false}>
          <mesh geometry={uma(formas, "taca")!} material={mat.taca} castShadow />
        </group>
      </group>
      <Preparo id="profilaxia" />
    </>
  );
}

const limita01 = (v: number) => Math.min(1, Math.max(0, v));
