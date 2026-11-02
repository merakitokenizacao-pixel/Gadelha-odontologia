import * as THREE from "three";

// Materiais das cenas. Anatomia: esmalte (marfim, com micro-relevo que quebra o brilho uniforme), dentina
// nas raízes (amarelada e fosca), gengiva (rosa dessaturado, pontilhada, sem cara de cera), osso.
// O que a clínica coloca tem material próprio: alinhador (plástico transparente), faceta e coroa
// (porcelana), implante (titânio cor de champanhe).

// relevo fino por ruído, na posição do objeto (sem textura baixada)
function relevo<T extends THREE.Material>(m: T, frequencia: number, forca: number, chave: string): T {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRelevo = { value: new THREE.Vector2(frequencia, forca) };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vPosObj;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPosObj = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vPosObj;
uniform vec2 uRelevo;
float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float ruido3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), u.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), u.x), u.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), u.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), u.x), u.y), u.z);
}`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
{
  vec3 q = vPosObj * uRelevo.x;
  vec3 d = vec3(ruido3(q), ruido3(q + 17.0), ruido3(q + 31.0)) - 0.5;
  normal = normalize(normal + d * uRelevo.y);
}`,
      );
  };
  m.customProgramCacheKey = () => `relevo-${chave}-${frequencia}-${forca}`;
  return m;
}

export const esmalte = (leve = false, frequencia = 2.2, forca = 0.09) =>
  relevo(
    new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      color: "#ffffff",
      roughness: 0.34,
      clearcoat: leve ? 0.2 : 0.38,
      clearcoatRoughness: 0.32,
      sheen: 0.25,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color("#fff3e2"),
      specularIntensity: 0.55,
    }),
    frequencia,
    forca,
    "esmalte",
  );

export const dentina = () =>
  new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    color: "#ffffff",
    roughness: 0.72,
    clearcoat: 0,
    sheen: 0.15,
    sheenColor: new THREE.Color("#f2e3c4"),
    specularIntensity: 0.3,
  });

export const gengiva = () =>
  relevo(
    new THREE.MeshPhysicalMaterial({
      vertexColors: true,
      color: "#ffffff",
      roughness: 0.5,
      clearcoat: 0.18,
      clearcoatRoughness: 0.45,
      sheen: 0.2,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color("#f0cfc8"),
      specularIntensity: 0.45,
    }),
    3.4,
    0.16,
    "gengiva",
  );

// cores da gengiva (as mesmas em todas as cenas): perto do dente um pouco mais clara, embaixo mais funda
export const COR_GENGIVA = { crista: "#d2a39b", fundo: "#bf8d87" };

// a borda do alinhador (onde a parede fica de perfil): fina e azul-acinzentada, como o plástico visto de
// lado (clara, ela sumia sobre o creme e a placa lia como uma mancha leitosa). Sem refração, a borda
// também ganha opacidade.
function bordaBrilhante<T extends THREE.Material>(m: T, alfa: boolean): T {
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>
  float perfil = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 3.0);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.55, 0.62, 0.72), perfil * ${alfa ? "0.62" : "0.7"});
  ${alfa ? "gl_FragColor.a = clamp(gl_FragColor.a * (1.0 + perfil * 1.4), 0.0, 1.0);" : ""}`,
    );
  };
  m.customProgramCacheKey = () => `borda-brilhante-${alfa}`;
  return m;
}

export const alinhador = (barato = false) =>
  barato
    ? bordaBrilhante(
        new THREE.MeshPhysicalMaterial({
          color: "#f7f9fa",
          transparent: true,
          opacity: 0.35,
          roughness: 0.06,
          clearcoat: 1,
          clearcoatRoughness: 0.04,
          side: THREE.FrontSide,
          depthWrite: false,
        }),
        true,
      )
    : bordaBrilhante(
        new THREE.MeshPhysicalMaterial({
          color: "#ffffff",
          transmission: 1,
          thickness: 0.5,
          roughness: 0.05,
          ior: 1.45,
          clearcoat: 1,
          clearcoatRoughness: 0.03,
          attenuationColor: new THREE.Color("#eef2f2"),
          attenuationDistance: 6,
          specularIntensity: 1,
          // só a face de fora: a de dentro, vista por trás, deixava traços escuros pontilhados
          side: THREE.FrontSide,
        }),
        false,
      );

export const porcelana = () =>
  relevo(
    new THREE.MeshPhysicalMaterial({
      color: "#f8f4ec",
      roughness: 0.24,
      clearcoat: 0.6,
      clearcoatRoughness: 0.14,
      sheen: 0.3,
      sheenRoughness: 0.4,
      sheenColor: new THREE.Color("#fff6ea"),
    }),
    2.2,
    0.05,
    "porcelana",
  );

export const titanio = () =>
  new THREE.MeshPhysicalMaterial({
    color: "#c8c3b6",
    metalness: 1,
    roughness: 0.3,
    clearcoat: 0.2,
    clearcoatRoughness: 0.25,
  });

export const aco = () =>
  new THREE.MeshPhysicalMaterial({
    color: "#dfe3e8",
    metalness: 1,
    roughness: 0.2,
  });
