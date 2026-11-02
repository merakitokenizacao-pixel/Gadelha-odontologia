import { Fragment, type ReactNode } from "react";

// O "º" da Urbanist tem o tamanho de um "o" ("1º andar" chegava a ser lido "10 andar"): ele sai na fonte
// do sistema, menor, como na v26 (classe .ord)
export function comOrdinal(texto: string): ReactNode {
  const partes = texto.split("º");
  if (partes.length === 1) return texto;
  return partes.map((parte, i) => (
    <Fragment key={i}>
      {parte}
      {i < partes.length - 1 ? <span className="ord">º</span> : null}
    </Fragment>
  ));
}
