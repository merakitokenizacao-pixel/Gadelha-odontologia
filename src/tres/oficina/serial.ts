// O formato que a oficina (worker) devolve para cada forma.
export type Serial = {
  atributos: Record<string, { array: Float32Array; itemSize: number }>;
  indice: Uint32Array | null;
  grupos: { start: number; count: number; materialIndex: number }[];
};
