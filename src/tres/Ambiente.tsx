"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ehToque } from "@/lib/tres";

// A luz de todas as cenas, presa à página (quem gira é o objeto, nunca a câmera nem a luz).
// - A sala que dá os reflexos é clara e quente, gerada aqui: com a sala escura do three.js, a borda dos
//   dentes refletia o escuro e ganhava um contorno.
// - O sol da entrada vem da esquerda, um pouco de cima e da frente, e faz a sombra na parede; a luz de
//   recorte vem de trás, pela direita, e desenha a borda direita das coroas. Principal : preenchimento ≈ 3:1.
// - A "parede" é um plano que só recebe a sombra, em marrom quente, e some num círculo antes da borda da
//   caixa (nada de sombra cortada reta). Sem parede, ninguém projeta sombra: a luz fica sem sombra, e os
//   materiais da cena ficam mais leves de preparar e de desenhar.
// no celular a caixa é pequena: a sombra com metade da resolução e o mesmo raio, em milímetros
const SOMBRA = ehToque() ? { lado: 1024, raio: 2.5 } : { lado: 2048, raio: 5 };

async function salaClara(gl: THREE.WebGLRenderer) {
  const cena = new THREE.Scene();
  cena.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ color: "#ebe8e2", side: THREE.BackSide })));
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: "#c7c1b6" }));
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = -4.5;
  cena.add(chao);
  const painel = (cor: string, forca: number, pos: [number, number, number], tam: [number, number]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(tam[0], tam[1]),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(cor).multiplyScalar(forca), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    cena.add(m);
  };
  painel("#fff7ec", 6.5, [-7, 5, 5], [6, 4.5]); // a janela do sol
  painel("#edf2f8", 2.2, [7, 1.5, 4], [4, 6]); // rebatedor frio
  painel("#ffffff", 3.2, [0, 8.5, 1], [11, 1.4]); // faixa de cima (o brilho do esmalte)
  painel("#fffaf3", 2.6, [5, 3, -7], [5, 4]); // recorte, de trás
  const pm = new THREE.PMREMGenerator(gl);
  await preparaGerador(gl, pm, cena);
  const alvo = pm.fromScene(cena, 0.025);
  pm.dispose();
  return alvo;
}

// Transformar a sala no mapa de reflexos usa dois programas caros de preparar, e a página parava mais de um segundo
// no Windows. Aqui eles são pedidos antes e preparados em segundo plano, como os das cenas (Preparo.tsx). O gerador
// não dá acesso a eles de outro jeito; se o three.js mudar por dentro, a sala sai do mesmo jeito, só com a parada.
type GeradorPorDentro = {
  _setSize?: (lado: number) => void;
  _allocateTargets?: () => THREE.WebGLRenderTarget;
  _lodMeshes?: THREE.Mesh[];
  _blurMaterial?: THREE.Material | null;
  _ggxMaterial?: THREE.Material | null;
};

async function preparaGerador(gl: THREE.WebGLRenderer, pm: THREE.PMREMGenerator, cena: THREE.Scene) {
  const g = pm as unknown as GeradorPorDentro;
  const antes = gl.getRenderTarget();
  const textura = new THREE.WebGLRenderTarget(1, 1);
  const camera = new THREE.PerspectiveCamera();
  gl.setRenderTarget(textura);
  const trabalhos: Promise<unknown>[] = [gl.compileAsync(cena, camera)];
  if (g._setSize && g._allocateTargets) {
    g._setSize(256);
    g._allocateTargets().dispose();
    const malha = g._lodMeshes?.[0];
    for (const material of [g._blurMaterial, g._ggxMaterial]) {
      if (!malha || !material) continue;
      malha.material = material;
      trabalhos.push(gl.compileAsync(malha, camera));
    }
  }
  gl.setRenderTarget(antes);
  await Promise.all(trabalhos);
  textura.dispose();
}

// A sala é feita uma vez por tela 3D (a textura de uma não serve para a outra), uma de cada vez. No celular, com
// mais de uma tela, ela é feita na primeira e as outras recebem uma cópia dos dados. Se a leitura não vier (zerada),
// cada tela faz a sua.
const salas = new WeakMap<THREE.WebGLRenderer, Promise<THREE.Texture>>();
let filaDaSala: Promise<unknown> = Promise.resolve();
let copiaDaSala: { dados: Uint16Array; largura: number; altura: number } | null = null;

async function fazSala(gl: THREE.WebGLRenderer): Promise<THREE.Texture> {
  if (copiaDaSala) {
    const t = new THREE.DataTexture(copiaDaSala.dados, copiaDaSala.largura, copiaDaSala.altura, THREE.RGBAFormat, THREE.HalfFloatType);
    t.mapping = THREE.CubeUVReflectionMapping;
    t.minFilter = t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  }
  const alvo = await salaClara(gl);
  if (ehToque()) {
    const dados = new Uint16Array(alvo.width * alvo.height * 4);
    gl.readRenderTargetPixels(alvo, 0, 0, alvo.width, alvo.height, dados);
    if (dados.some((v) => v !== 0)) copiaDaSala = { dados, largura: alvo.width, altura: alvo.height };
  }
  return alvo.texture;
}

export function salaDe(gl: THREE.WebGLRenderer) {
  let sala = salas.get(gl);
  if (!sala) {
    sala = filaDaSala.then(() => fazSala(gl));
    filaDaSala = sala.catch(() => {});
    salas.set(gl, sala);
  }
  return sala;
}

function sombraQueSome(raio: number, opacidade: number) {
  const m = new THREE.ShadowMaterial({ transparent: true, opacity: opacidade, color: new THREE.Color("#3d2c19") });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRaio = { value: raio };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vLocal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLocal = position.xy;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vLocal;\nuniform float uRaio;")
      .replace("#include <fog_fragment>", "#include <fog_fragment>\ngl_FragColor.a *= 1.0 - smoothstep(uRaio * 0.5, uRaio, length(vLocal));");
  };
  m.customProgramCacheKey = () => "sombra-some";
  return m;
}

export function Ambiente({
  alcance = 32,
  parede = -10,
  sombra = 0.2,
  raio = 30,
  centro = [0, 0] as [number, number],
  luz = 1,
  sol = [-58, 34, 46] as [number, number, number],
  rebatida = 0,
}: {
  alcance?: number;
  parede?: number | null;
  sombra?: number;
  raio?: number;
  centro?: [number, number];
  luz?: number;
  sol?: [number, number, number];
  rebatida?: number; // luz que volta do chão claro (creme), por baixo
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const matSombra = useMemo(() => sombraQueSome(raio, sombra), [raio, sombra]);

  useEffect(() => {
    let vivo = true;
    scene.environmentIntensity = 0.55;
    salaDe(gl)
      .then((sala) => {
        if (!vivo) return;
        scene.environment = sala;
        invalidate();
      })
      .catch(() => {});
    return () => {
      vivo = false;
      scene.environment = null;
    };
  }, [gl, scene, invalidate]);

  return (
    <>
      <ambientLight intensity={0.06 * luz} color="#fff4e6" />
      {rebatida > 0 ? <hemisphereLight args={["#fff8ef", "#eadcc2", rebatida * luz]} /> : null}
      <directionalLight
        position={sol}
        intensity={3.1 * luz}
        color="#fff6ec"
        castShadow={parede !== null}
        shadow-mapSize={[SOMBRA.lado, SOMBRA.lado]}
        shadow-radius={SOMBRA.raio}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
        shadow-camera-left={-alcance}
        shadow-camera-right={alcance}
        shadow-camera-top={alcance}
        shadow-camera-bottom={-alcance}
        shadow-camera-near={1}
        shadow-camera-far={260}
      />
      <directionalLight position={[46, 20, -44]} intensity={1.5 * luz} color="#fff7ec" />
      {parede !== null ? (
        <mesh position={[centro[0], centro[1], parede]} receiveShadow material={matSombra}>
          <planeGeometry args={[raio * 2.2, raio * 2.2]} />
        </mesh>
      ) : null}
    </>
  );
}
