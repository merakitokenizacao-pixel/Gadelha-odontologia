"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { FORMAS_CENA, type Formas } from "./formas";
import type { Serial } from "./serial";

// Pede à oficina (worker) as formas de uma cena; cada cena é feita uma vez só para a página inteira.
// Sem worker (navegador antigo), gera aqui mesmo.
type Resposta = { id: number; formas?: Record<string, Serial | Serial[]>; erro?: string };

let oficina: Worker | null = null;
let proximo = 1;
const esperando = new Map<number, (r: Resposta) => void>();
const prontas = new Map<string, Promise<Formas>>();

function monta(s: Serial): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  for (const [nome, a] of Object.entries(s.atributos)) g.setAttribute(nome, new THREE.BufferAttribute(a.array, a.itemSize));
  if (s.indice) g.setIndex(new THREE.BufferAttribute(s.indice, 1));
  for (const gr of s.grupos) g.addGroup(gr.start, gr.count, gr.materialIndex);
  g.computeBoundingSphere();
  return g;
}

function abreOficina() {
  if (oficina || typeof Worker === "undefined") return oficina;
  try {
    oficina = new Worker(new URL("./oficina.worker.ts", import.meta.url), { type: "module" });
    oficina.onmessage = (e: MessageEvent<Resposta>) => {
      const f = esperando.get(e.data.id);
      if (f) {
        esperando.delete(e.data.id);
        f(e.data);
      }
    };
  } catch {
    oficina = null;
  }
  return oficina;
}

export function pedeFormas(cena: string): Promise<Formas> {
  const pronta = prontas.get(cena);
  if (pronta) return pronta;
  const w = abreOficina();
  const promessa: Promise<Formas> = w
    ? new Promise((ok, falha) => {
        const id = proximo++;
        esperando.set(id, (r) => {
          if (r.erro || !r.formas) return falha(new Error(r.erro));
          const f: Formas = {};
          for (const [k, v] of Object.entries(r.formas)) f[k] = Array.isArray(v) ? v.map(monta) : monta(v);
          ok(f);
        });
        w.postMessage({ id, cena });
      })
    : Promise.resolve(FORMAS_CENA[cena]());
  prontas.set(cena, promessa);
  return promessa;
}

export function useFormas(cena: string) {
  const [formas, setFormas] = useState<Formas | null>(null);
  useEffect(() => {
    let vivo = true;
    pedeFormas(cena).then((f) => {
      if (vivo) setFormas(f);
    });
    return () => {
      vivo = false;
    };
  }, [cena]);
  return formas;
}

export const uma = (f: Formas | null, k: string) => (f ? (f[k] as THREE.BufferGeometry) : null);
export const varias = (f: Formas | null, k: string) => (f ? (f[k] as THREE.BufferGeometry[]) : []);
