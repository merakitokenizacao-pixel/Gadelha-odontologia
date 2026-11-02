// Onde cada filme 3D está (0 a 1). Quem conduz escreve aqui (a rolagem, o relógio do carrossel ou o laço
// da tecnologia); cada cena lê no próprio quadro, sem passar pelo React.
export type Filme = { p: number };

export const FILMES: Record<string, Filme> = {
  orto: { p: 0 },
  estetica: { p: 0 },
  implante: { p: 0 },
  profilaxia: { p: 0 },
  escaneamento: { p: 0 },
  simulacao: { p: 0 },
  impressao: { p: 0 },
};

// trechos do filme
export const limita = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const trecho = (p: number, a: number, b: number) => limita((p - a) / (b - a));
export const curva = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const freia = (t: number) => 1 - Math.pow(1 - t, 3);
export const sobe = (p: number, a: number, b: number) => curva(trecho(p, a, b));
// aparece em [a, b] e some em [c, d]
export const janela = (p: number, a: number, b: number, c: number, d: number) => sobe(p, a, b) * (1 - sobe(p, c, d));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
