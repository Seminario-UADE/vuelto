import { colors } from "@/theme";

/** Estilo de una fila dentro de una lista agrupada: divisor arriba, salvo en la primera. */
export function divisor(indice: number) {
  return { borderTopWidth: indice ? 1 : 0, borderColor: colors.divider } as const;
}
