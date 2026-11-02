"use client";

// Laboratório (não vai para o site): quadros parados de uma cena 3D, lado a lado, para conferir e dar nota.
// /lab?cena=implante&q=0.05,0.25,0.4,0.55,0.8,1
import { View } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useState } from "react";
import { colisoesOrto, formasOrto } from "@/tres/oficina/orto";
import { Palco } from "@/tres/Palco";
import { CENAS_LAB as CENAS } from "./cenas";

export default function Lab() {
  const [cena, setCena] = useState("implante");
  const [quadros, setQuadros] = useState<number[]>([0.06, 0.24, 0.4, 0.56, 0.82, 1]);
  const [lado, setLado] = useState(420);
  const [alto, setAlto] = useState<number | undefined>();
  const [vista, setVista] = useState<string | undefined>();
  // &fundo=232a5e: o fundo dos quadros (as cenas da tecnologia ficam sobre o painel azul)
  const [fundo, setFundo] = useState<string | undefined>();
  const [conferencia, setConferencia] = useState<string[]>([]);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get("cena")) setCena(q.get("cena")!);
    if (q.get("q")) setQuadros(q.get("q")!.split(",").map(Number));
    if (q.get("lado")) setLado(Number(q.get("lado")));
    // &alto=450: quadros em retrato (os cartões da tecnologia são 4:5)
    if (q.get("alto")) setAlto(Number(q.get("alto")));
    if (q.get("vista")) setVista(q.get("vista")!);
    if (q.get("fundo")) setFundo(`#${q.get("fundo")}`);
    // /lab?checa=orto: a maior penetração entre dentes vizinhos em cada instante
    if (q.get("checa") === "orto") {
      const linhas = colisoesOrto();
      const t0 = performance.now();
      try {
        const f = formasOrto();
        linhas.push(`formasOrto: ${Math.round(performance.now() - t0)} ms, ${Object.keys(f).join(", ")}`);
        f.alinhadores.forEach((g, i) => {
          g.computeBoundingBox();
          const b = g.boundingBox!;
          const p = g.attributes.position.array as Float32Array;
          let ruins = 0;
          for (let k = 0; k < p.length; k++) if (!Number.isFinite(p[k])) ruins++;
          // a parede mais alta acima de cada dente (procura aletas)
          const fmt = (v: { x: number; y: number; z: number }) => `${v.x.toFixed(1)},${v.y.toFixed(1)},${v.z.toFixed(1)}`;
          // normais nulas (triângulos degenerados) e triângulos finos demais
          const n = g.attributes.normal.array as Float32Array;
          let nulas = 0;
          for (let k = 0; k < n.length; k += 3) if (Math.hypot(n[k], n[k + 1], n[k + 2]) < 0.5) nulas++;
          const ix = g.index!.array;
          let finos = 0;
          const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
          for (let k = 0; k < ix.length; k += 3) {
            va.fromArray(p, ix[k] * 3); vb.fromArray(p, ix[k + 1] * 3); vc.fromArray(p, ix[k + 2] * 3);
            const area = vb.clone().sub(va).cross(vc.clone().sub(va)).length() / 2;
            if (area < 1e-6) finos++;
          }
          linhas.push(`alinhador ${i + 1}: min ${fmt(b.min)} max ${fmt(b.max)} não finitos ${ruins} normais nulas ${nulas} triângulos degenerados ${finos} de ${ix.length / 3}`);
        });
      } catch (e) {
        linhas.push(`formasOrto falhou: ${(e as Error).stack}`);
      }
      setConferencia(linhas);
    }
  }, []);
  return (
    <main style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: 12 }}>
      {quadros.map((p) => (
        <div key={p} style={{ position: "relative", width: lado, height: alto ?? lado, borderRadius: 18, background: fundo ?? "rgba(0,0,0,0.035)" }}>
          <View style={{ position: "absolute", inset: 0 }}>{CENAS[cena]?.(p, vista)}</View>
          <span style={{ position: "absolute", left: 10, top: 8, font: "600 12px system-ui", color: fundo ? "#a9adca" : "#6b6552" }}>p = {p}</span>
        </div>
      ))}
      {conferencia.length ? (
        <pre id="conferencia" style={{ width: "100%", font: "12px ui-monospace, monospace", whiteSpace: "pre-wrap" }}>
          {conferencia.join(String.fromCharCode(10))}
        </pre>
      ) : null}
      <Palco />
    </main>
  );
}
