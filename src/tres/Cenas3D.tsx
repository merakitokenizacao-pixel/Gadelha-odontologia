"use client";

import { View } from "@react-three/drei";
import type { ReactNode } from "react";
import { useCenaPronta } from "@/lib/tres";
import { CenaEstetica } from "./cenas/Estetica";
import { CenaImplante } from "./cenas/Implante";
import { CenaOrtodontia } from "./cenas/Ortodontia";
import { CenaProfilaxia } from "./cenas/Profilaxia";
import { CenaEscaneamento, CenaSimulacao } from "./cenas/Tecnologia";

// As cenas 3D da página, por nome. Este módulo (e o three.js) só carrega quando o 3D é liberado.
export const CENAS: Record<string, () => ReactNode> = {
  orto: () => <CenaOrtodontia />,
  estetica: () => <CenaEstetica />,
  implante: () => <CenaImplante />,
  profilaxia: () => <CenaProfilaxia />,
  escaneamento: () => <CenaEscaneamento />,
  simulacao: () => <CenaSimulacao />,
};

// No computador: a cena dentro da tela única da página (Palco.tsx). Só é desenhada depois de preparada.
export function Cena3D({ id, className, visivel }: { id: string; className: string; visivel: boolean }) {
  const cena = CENAS[id];
  const pronta = useCenaPronta(id);
  if (!cena) return null;
  return (
    <View className={className} visible={visivel && pronta}>
      {cena()}
    </View>
  );
}
