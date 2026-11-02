import { Abertura } from "@/components/Abertura";
import { Clinica } from "@/components/Clinica";
import { Etiquetas } from "@/components/Etiquetas";
import { Experiencia } from "@/components/Experiencia";
import { Frase } from "@/components/Frase";
import { Luz } from "@/components/Luz";
import { Onde } from "@/components/Onde";
import { Rodape } from "@/components/Rodape";
import { Rolagem } from "@/components/Rolagem";
import { Tecnologia } from "@/components/Tecnologia";
import { Topo } from "@/components/Topo";
import { Vitrine } from "@/components/Vitrine";
import { Tres } from "@/components/Tres";

export default function Inicio() {
  return (
    <>
      <a className="pular" href="#tratamentos">
        Pular para o conteúdo
      </a>
      <Luz />
      <Topo />
      <main>
        <Abertura />
        <Frase />
        <Experiencia />
        <Vitrine />
        <Tecnologia />
        <Clinica />
        <Onde />
      </main>
      <Rodape />
      <Tres />
      <Etiquetas />
      <div className="grao" aria-hidden="true" />
      <Rolagem />
    </>
  );
}
