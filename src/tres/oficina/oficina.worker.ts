/// <reference lib="webworker" />
import * as THREE from "three";
import { FORMAS_CENA } from "./formas";
import type { Serial } from "./serial";

// A oficina: gera as formas de uma cena fora da linha principal (no celular, a geometria das cenas levava
// dezenas de milissegundos e travava a rolagem) e devolve os vértices, transferindo os buffers.
function serializa(g: THREE.BufferGeometry, transfer: Transferable[]): Serial {
  const atributos: Serial["atributos"] = {};
  for (const nome of Object.keys(g.attributes)) {
    const a = g.getAttribute(nome) as THREE.BufferAttribute;
    const arr = new Float32Array(a.array as ArrayLike<number>);
    atributos[nome] = { array: arr, itemSize: a.itemSize };
    transfer.push(arr.buffer);
  }
  let indice: Uint32Array | null = null;
  if (g.index) {
    indice = new Uint32Array(g.index.array as ArrayLike<number>);
    transfer.push(indice.buffer);
  }
  return { atributos, indice, grupos: g.groups.map((gr) => ({ start: gr.start, count: gr.count, materialIndex: gr.materialIndex ?? 0 })) };
}

self.onmessage = (e: MessageEvent<{ id: number; cena: string }>) => {
  const { id, cena } = e.data;
  const formas = FORMAS_CENA[cena]?.();
  if (!formas) {
    self.postMessage({ id, erro: `cena desconhecida: ${cena}` });
    return;
  }
  const transfer: Transferable[] = [];
  const saida: Record<string, Serial | Serial[]> = {};
  for (const [k, g] of Object.entries(formas)) saida[k] = Array.isArray(g) ? g.map((x) => serializa(x, transfer)) : serializa(g, transfer);
  self.postMessage({ id, formas: saida }, transfer);
};
