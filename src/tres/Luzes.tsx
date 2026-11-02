"use client";

import { Environment, Lightformer } from "@react-three/drei";

// A luz de todas as cenas: o sol da entrada vem de cima, à esquerda (quente); um rebatedor frio à direita;
// uma faixa por cima para o brilho do esmalte. Tudo gerado aqui, sem arquivo de ambiente baixado.
export function Luzes({ intensidade = 1, sombras = true, alcance = 40 }: { intensidade?: number; sombras?: boolean; alcance?: number }) {
  return (
    <>
      <ambientLight intensity={0.18 * intensidade} color="#fff4e6" />
      <directionalLight
        position={[-30, 45, 40]}
        intensity={2.1 * intensidade}
        color="#fff0d9"
        castShadow={sombras}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-radius={6}
        shadow-camera-left={-alcance}
        shadow-camera-right={alcance}
        shadow-camera-top={alcance}
        shadow-camera-bottom={-alcance}
        shadow-camera-near={1}
        shadow-camera-far={160}
      />
      <directionalLight position={[35, 8, 30]} intensity={0.5 * intensidade} color="#e4ebf5" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.6} color="#fff0d8" position={[-5, 6, 6]} scale={[8, 5, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.0} color="#e8eef7" position={[7, 1, 5]} scale={[5, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.8} color="#ffffff" position={[0, 9, 2]} scale={[12, 1.2, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={0.7} color="#f4e7cf" position={[0, -2, -8]} scale={6} target={[0, 0, 0]} />
        <mesh scale={40}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color="#cfc4ae" side={1} />
        </mesh>
      </Environment>
    </>
  );
}
