import { space } from "../theme";

/**
 * Margen entre la cápsula de la barra de pestañas y el borde de abajo de la pantalla.
 *
 * Con zona segura (el indicador de inicio de los iPhone con Face ID, 34 pt) la cápsula baja y se
 * mete en esa zona, pero sigue por encima de la rayita del indicador (que ocupa los ~13 pt de
 * abajo): `inset - space.md` deja 22 pt, no 34. Sin zona segura (botón de inicio, Android con
 * botones, escritorio) queda `space.md`, como siempre.
 */
export function margenBajoLaCapsula(insetInferior: number): number {
  return Math.max(insetInferior - space.md, space.md);
}
