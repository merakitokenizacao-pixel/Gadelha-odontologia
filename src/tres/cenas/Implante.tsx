"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Ambiente } from "../Ambiente";
import { desvaneceEmbaixo, materialDoCorte, planoDoCorte, type Raiz } from "../corte";
import { FORMAS, RAIZ_MOLAR, TRONCO, TRONCO_FIM } from "../dente";
import { FILMES, janela, mix, sobe } from "../filme";
import { dentina, esmalte, gengiva, porcelana, titanio } from "../materiais";
import { IMPLANTE, topoGengivaImplante, topoOssoImplante } from "../oficina/formas";
import { uma, useFormas } from "../oficina/usaFormas";

// T3 · Prótese e implantes. Um trecho reto da arcada de baixo, cortado ao meio como em livro de anatomia:
// a gengiva por cima, o osso trabecular no corte (e nas laterais do trecho), dois molares vizinhos com as
// raízes nos alvéolos e um vão.
// 1) o dente que falta aparece como sombra translúcida; 2) o implante desce girando para dentro do osso;
// 3) cicatrização: o osso novo, mais claro, ocupa a rosca e se integra; 4) o pilar encaixa e a coroa (com o
// perfil de emergência) assenta; 5) o dente completo, de frente, no corte. Embaixo, tudo se desfaz no fundo
// da página.
// As formas vêm da oficina (worker); até ficarem prontas, a cena mostra só a luz.

const { VIZINHO, TOPO, COMP } = IMPLANTE;
const DESVANECE: [number, number] = [-18, -14.2];

// as raízes dos dois molares (para a lâmina dura no corte): o tronco e as duas raízes de cada um
const RAIZES: Raiz[] = [-VIZINHO, VIZINHO].flatMap((cx) => [
  { cx, y0: 0.2, y1: -TRONCO, meia: (FORMAS.molar.largura * FORMAS.molar.colo) / 2, fim: TRONCO_FIM },
  ...[-1, 1].map((lado) => ({
    cx: cx + lado * RAIZ_MOLAR.centro * FORMAS.molar.largura,
    y0: -TRONCO,
    y1: RAIZ_MOLAR.ponta,
    meia: RAIZ_MOLAR.meia * FORMAS.molar.largura,
    curva: lado * RAIZ_MOLAR.curva,
  })),
]);

export function CenaImplante({ p: fixo }: { p?: number }) {
  const formas = useFormas("implante", "implante");
  const plano = useMemo(planoDoCorte, []);
  const desv = useMemo(() => ({ y: new THREE.Vector2(...DESVANECE), x: new THREE.Vector2(400, 500) }), []);
  const mat = useMemo(() => {
    const m = {
      gengiva: desvaneceEmbaixo(gengiva(), desv),
      // o osso de fora (as pontas do trecho, vistas no giro) leva o mesmo desenho da seção
      osso: materialDoCorte(plano, { tipo: "osso", cor: "#f1e9da", cor2: "#d8c7a3", crista: topoOssoImplante, desvanece: DESVANECE, frente: true }).material,
      esm: desvaneceEmbaixo(esmalte(), desv),
      den: desvaneceEmbaixo(dentina(), desv),
      porcelana: porcelana(),
      titanio: desvaneceEmbaixo(titanio(), desv),
      fantasma: new THREE.MeshBasicMaterial({ color: "#b9a77d", transparent: true, opacity: 0, depthWrite: false }),
      invisivel: new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
      corteGengiva: materialDoCorte(plano, { tipo: "gengiva", cor: "#d6a69f", crista: topoGengivaImplante, desvanece: DESVANECE }),
      corteOsso: materialDoCorte(plano, { tipo: "osso", cor: "#f1e9da", cor2: "#d8c7a3", crista: topoOssoImplante, raizes: RAIZES, desvanece: DESVANECE }),
    };
    m.gengiva.clippingPlanes = [plano];
    const u = m.corteOsso.uniforms;
    u.uImpR0.value = 2.2;
    u.uImpR1.value = 1.75;
    u.uImpComp.value = COMP;
    return m;
  }, [plano, desv]);
  const dentes = useMemo(() => [mat.esm, mat.den], [mat]);

  const implante = useRef<THREE.Mesh>(null);
  const pilar = useRef<THREE.Mesh>(null);
  const coroa = useRef<THREE.Mesh>(null);
  const fantasma = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const p = fixo ?? FILMES.implante.p;
    // 1) o dente que falta
    mat.fantasma.opacity = 0.3 * janela(p, 0.02, 0.1, 0.3, 0.38);
    if (fantasma.current) fantasma.current.visible = mat.fantasma.opacity > 0.003;
    // 2) o implante desce girando (quatro voltas)
    const d = sobe(p, 0.1, 0.38);
    const yImp = mix(15, TOPO, d);
    if (implante.current) {
      implante.current.position.y = yImp;
      implante.current.rotation.y = d * Math.PI * 8;
      implante.current.visible = p > 0.08;
    }
    // 3) o vão entre o osso e a rosca: aberto durante a entrada; na cicatrização, o osso novo o ocupa
    const u = mat.corteOsso.uniforms;
    u.uImpLigado.value = p > 0.08 ? 1 : 0;
    u.uImpTopo.value = Math.min(yImp, TOPO + 2.2);
    u.uImpPonta.value = yImp - COMP;
    const cura = sobe(p, 0.44, 0.62);
    u.uVao.value = 0.8 * (1 - cura);
    u.uCura.value = cura;
    // 4) pilar (uma volta) e coroa
    const dp = sobe(p, 0.66, 0.76);
    if (pilar.current) {
      pilar.current.position.y = mix(13, TOPO, dp);
      pilar.current.rotation.y = dp * Math.PI * 2;
      pilar.current.visible = p > 0.655;
    }
    const dc = sobe(p, 0.74, 0.86);
    if (coroa.current) {
      coroa.current.position.y = mix(17, -0.5, dc);
      coroa.current.visible = p > 0.735;
      // só faz sombra na parede quando assenta (no ar, a sombra virava uma mancha solta)
      coroa.current.castShadow = dc > 0.92;
    }
    // 5) o dente completo, no corte e de frente (o giro final saiu: abria um vão na ponta do bloco)
  });

  const camera = <PerspectiveCamera makeDefault fov={23} near={1} far={600} position={[0, 4, 138]} onUpdate={(c) => c.lookAt(0, -3.4, 0)} />;
  // a luz rebatida do osso claro, de baixo, clareia a face de baixo das coroas
  const ambiente = <Ambiente alcance={34} parede={-10} sombra={0.2} raio={27} centro={[3, -1]} rebatida={0.5} />;
  if (!formas) return <>{camera}{ambiente}</>;

  return (
    <>
      {camera}
      {ambiente}
      <group>
        {/* gengiva e osso: a metade da frente sai pelo corte; as faces de trás pintam a seção */}
        <mesh geometry={uma(formas, "gengiva")!} material={mat.gengiva} castShadow />
        <mesh geometry={uma(formas, "osso")!} material={mat.osso} />
        <mesh geometry={uma(formas, "gengiva")!} material={mat.corteGengiva.material} />
        <mesh geometry={uma(formas, "osso")!} material={mat.corteOsso.material} />
        {/* os vizinhos: coroa em esmalte, tronco e raízes em dentina */}
        <mesh geometry={uma(formas, "dente")!} material={dentes} position={[-VIZINHO, 0, 0]} rotation={[0, 0.05, 0.015]} />
        <mesh geometry={uma(formas, "dente")!} material={dentes} position={[VIZINHO, 0, 0]} rotation={[0, -0.04, -0.01]} scale={[1.02, 1.03, 1]} />
        <mesh geometry={uma(formas, "coroaSombra")!} material={mat.invisivel} position={[-VIZINHO, 0, 0]} castShadow />
        <mesh geometry={uma(formas, "coroaSombra")!} material={mat.invisivel} position={[VIZINHO, 0, 0]} scale={[1.02, 1.03, 1]} castShadow />
        <mesh ref={fantasma} geometry={uma(formas, "fantasma")!} material={mat.fantasma} />
        <mesh ref={implante} geometry={uma(formas, "implante")!} material={mat.titanio} position={[0, 15, 0]} />
        <mesh ref={pilar} geometry={uma(formas, "pilar")!} material={mat.titanio} position={[0, 13, 0]} castShadow />
        <mesh ref={coroa} geometry={uma(formas, "coroa")!} material={mat.porcelana} position={[0, 17, 0]} />
      </group>
    </>
  );
}
