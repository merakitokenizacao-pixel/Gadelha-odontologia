"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useCenaPerto, useCenaPronta, useTresLiberado, useToque } from "@/lib/tres";

// O desenho de um filme: embaixo, o pôster renderizado antes (aparece até a cena estar pronta e acesa, e
// sempre para quem pede menos movimento, num quadro próprio se "calmo"); por cima, a cena 3D, carregada só
// quando o 3D é liberado. No computador, ela entra na tela única da página; no celular e no tablet, tem a
// própria tela, dentro desta caixa, e só existe enquanto o cartão está perto da tela.
const Cena3D = dynamic(() => import("@/tres/Cenas3D").then((m) => m.Cena3D), { ssr: false });
const CenaToque = dynamic(() => import("@/tres/CenaToque").then((m) => m.CenaToque), { ssr: false });

// poster={false}: sem pôster (na impressão, a foto da clínica fica no cartão, por baixo).
export function Cena({
  id,
  className,
  visivel = true,
  calmo = false,
  poster = true,
}: {
  id: string;
  className: string;
  visivel?: boolean;
  calmo?: boolean;
  poster?: boolean;
}) {
  const liberado = useTresLiberado();
  const toque = useToque();
  const perto = useCenaPerto(id);
  const pronta = useCenaPronta(id);
  const [semPoster, setSemPoster] = useState(false);
  return (
    <>
      {calmo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="poster poster--calmo" src={`/img/cenas/${id}-calmo.webp`} alt="" aria-hidden="true" loading="lazy" decoding="async" />
      ) : null}
      {semPoster || !poster ? null : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={`poster ${calmo ? "poster--movimento" : ""} ${pronta && visivel ? "poster--some" : ""}`}
          src={`/img/cenas/${id}.webp`}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={() => setSemPoster(true)}
        />
      )}
      {!liberado ? null : !toque ? (
        <Cena3D id={id} className={className} visivel={visivel} />
      ) : perto ? (
        <CenaToque id={id} className={className} visivel={visivel} />
      ) : null}
    </>
  );
}
