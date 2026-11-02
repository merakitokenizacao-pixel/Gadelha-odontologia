"use client";

// As cenas 3D do laboratório e dos pôsteres (não vão para o site), com o quadro do filme fixo.
import type { ReactNode } from "react";
import { CenaEstetica } from "@/tres/cenas/Estetica";
import { CenaImplante } from "@/tres/cenas/Implante";
import { CenaOrtodontia } from "@/tres/cenas/Ortodontia";
import { CenaProfilaxia } from "@/tres/cenas/Profilaxia";
import { CenaEscaneamento, CenaSimulacao } from "@/tres/cenas/Tecnologia";

export const CENAS_LAB: Record<string, (p: number, vista?: string) => ReactNode> = {
  orto: (p, vista) => <CenaOrtodontia p={p} vista={vista === "oclusal" || vista === "semgengiva" || vista === "bandeja" ? vista : undefined} />,
  estetica: (p) => <CenaEstetica p={p} />,
  implante: (p) => <CenaImplante p={p} />,
  profilaxia: (p) => <CenaProfilaxia p={p} />,
  escaneamento: (p) => <CenaEscaneamento p={p} />,
  simulacao: (p) => <CenaSimulacao p={p} />,
};
