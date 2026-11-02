"use client";

import { useEffect, useRef } from "react";
import { LINKS } from "@/lib/conteudo";
import { naRolagem } from "@/lib/rolagem";
import { Nome, Simbolo } from "./Marca";

// O topo fica creme depois de rolar e azul sobre os painéis azuis (data-escuro). O símbolo só aparece
// quando a espiral da abertura pousa nele (Abertura.tsx marca a raiz com .voa e .pousou).
export function Topo() {
  const ref = useRef<HTMLElement>(null);

  useEffect(
    () =>
      naRolagem(() => {
        const topo = ref.current;
        if (!topo) return;
        topo.classList.toggle("rolou", scrollY > 8);
        const linha = topo.offsetHeight * 0.5;
        let escuro = false;
        document.querySelectorAll("[data-escuro]").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.top <= linha && r.bottom > linha) escuro = true;
        });
        topo.classList.toggle("topo--escuro", escuro);
      }),
    [],
  );

  return (
    <header className="topo" ref={ref}>
      <div className="moldura topo__linha">
        <a className="marca" href="#inicio" aria-label="Gadelha Odontologia, voltar ao início">
          <Simbolo />
          <Nome />
        </a>
        <nav className="menu" aria-label="Seções">
          <a href="#tratamentos">Tratamentos</a>
          <a href="#tecnologia">Tecnologia</a>
          <a href="#clinica">A clínica</a>
          <a href="#onde">Onde estamos</a>
        </nav>
        <a className="botao botao--tinta botao--pequeno" href={LINKS.agendar} target="_blank" rel="noopener">
          Agendar
        </a>
      </div>
    </header>
  );
}
