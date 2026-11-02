// A marca do sprite (símbolo e nome em vetor, pintados com currentColor).
export function Simbolo({ className = "marca__simbolo" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 35.5 32.09" aria-hidden="true">
      <use href="/marca/sprite.svg#m-simbolo" />
    </svg>
  );
}

export function Nome({ className = "marca__nome" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 76.664 27.637" aria-hidden="true">
      <use href="/marca/sprite.svg#m-nome" />
    </svg>
  );
}

export function Icone({ nome, className = "icone" }: { nome: "i-whatsapp" | "i-relogio" | "i-cartao" | "i-check" | "i-seta"; className?: string }) {
  return (
    <svg className={className} aria-hidden="true">
      <use href={`/marca/sprite.svg#${nome}`} />
    </svg>
  );
}
