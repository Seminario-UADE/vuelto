import type { ColorValue } from "react-native";
import { colorPorTema } from "./theme-color";

/**
 * Tema de Vuelto: el ÚNICO archivo de la app con colores escritos a mano.
 *
 * Valores de docs/design/DESIGN.md v6 §2–§4. Los nombres son roles (semánticos), no colores:
 * cada rol tiene un valor en el tema claro y otro en el oscuro, compuestos por separado (el oscuro
 * no es la inversión del claro). La app sigue la apariencia del sistema
 * (`userInterfaceStyle: "automatic"`).
 *
 * Las pantallas leen `colors.<rol>` como siempre. En iOS cada rol es un `DynamicColorIOS`: el
 * sistema lo resuelve y lo cambia solo al pasar a oscuro, sin re-render. En Android y web el valor
 * sale del esquema que fija `TemaProvider` (ver `theme-color.ts`).
 */

const paleta = {
  // Claro
  crema: "#F3EBD6",
  lino: "#EAE1C8",
  arena: "#DFD5B9",
  divisorClaro: "#D3C8A8",
  esmeraldaNegro: "#02110C",
  musgo: "#4E6656",
  bordeControlClaro: "#6A7A70",
  oliva: "#1A422F",
  ocre: "#83591A",
  ocreClaro: "#F1DFB4",
  oxido: "#8C4843",
  salviaPalida: "#D9E6D8",
  // Oscuro
  bosqueProfundo: "#051F20",
  pino: "#0B2B26",
  musgoOscuro: "#163832",
  helecho: "#235347",
  liquen: "#A3B5A8",
  bordeControlOscuro: "#5E8A70",
  salviaClara: "#8EB69B",
  ambar: "#E2B65E",
  ambarOscuro: "#2B2410",
  coral: "#EE8F84",
} as const;

type Rol =
  | "canvas"
  | "surface"
  | "surfaceStrong"
  | "divider"
  | "ink"
  | "inkSecondary"
  | "controlBorder"
  | "accent"
  | "onAccent"
  | "warning"
  | "warningBg"
  | "error"
  | "successBg"
  | "decisionBg"
  | "onDecision"
  | "onDecisionMuted"
  | "onDecisionAccent"
  | "decisionSurface"
  | "scrim"
  | "scrimOverlay"
  | "scrimSurface"
  | "onScrim"
  | "onScrimMuted"
  | "backdrop"
  | "transparent";

export type Tema = Readonly<Record<Rol, string>>;

/** Tema claro: crema y tinta esmeralda. La decisión va en bosque profundo. */
const claro: Tema = {
  /** Fondo de todas las pantallas. */
  canvas: paleta.crema,
  /** Hero de Inicio, listas agrupadas y tarjetas. */
  surface: paleta.lino,
  /** Chips, campos, círculos de comercio, fila seleccionada. */
  surfaceStrong: paleta.arena,
  /** Líneas divisorias. Nunca como único borde de un control. */
  divider: paleta.divisorClaro,
  /** Texto principal e íconos. */
  ink: paleta.esmeraldaNegro,
  /** Texto secundario y metadatos. En claro, sobre `canvas` o `surface` (no `surfaceStrong`). */
  inkSecondary: paleta.musgo,
  /** Borde de radios, checkboxes e inputs no seleccionados. */
  controlBorder: paleta.bordeControlClaro,
  /** Único acento: primario, selección, tab activa, progreso, links. */
  accent: paleta.oliva,
  /** Texto e íconos sobre `accent`. */
  onAccent: paleta.crema,
  /** Advertencia (queda poco, otro día). Siempre con texto o ícono. */
  warning: paleta.ocre,
  warningBg: paleta.ocreClaro,
  /** Agotado, error de lectura. */
  error: paleta.oxido,
  /** Confirmación y píldora de ahorro (con texto `ink`). */
  successBg: paleta.salviaPalida,
  /** Tarjeta de decisión: la única superficie invertida. */
  decisionBg: paleta.bosqueProfundo,
  onDecision: paleta.crema,
  /** Razón y base sobre la decisión. */
  onDecisionMuted: paleta.liquen,
  /** Botón «Usar [medio]», inicial del medio y detalles sobre la decisión (texto encima: `ink`). */
  onDecisionAccent: paleta.salviaClara,
  /** Superficie secundaria dentro de la decisión (campo de monto, pista de la barra). */
  decisionSurface: "rgba(243,235,214,0.10)",
  /** Visor de cámara (Escanear ticket): oscuro en los dos temas. */
  scrim: paleta.bosqueProfundo,
  scrimOverlay: "rgba(5,31,32,0.55)",
  scrimSurface: "rgba(243,235,214,0.12)",
  onScrim: paleta.crema,
  onScrimMuted: paleta.liquen,
  /** Velo detrás de los sheets (lo dibuja el sistema; se usa en web). */
  backdrop: "rgba(2,17,12,0.35)",
  transparent: "transparent",
};

/** Tema oscuro: bosque profundo y crema. Lo elevado es más claro; la decisión va en crema. */
const oscuro: Tema = {
  canvas: paleta.bosqueProfundo,
  surface: paleta.pino,
  surfaceStrong: paleta.musgoOscuro,
  divider: paleta.helecho,
  ink: paleta.crema,
  inkSecondary: paleta.liquen,
  controlBorder: paleta.bordeControlOscuro,
  accent: paleta.salviaClara,
  onAccent: paleta.esmeraldaNegro,
  warning: paleta.ambar,
  warningBg: paleta.ambarOscuro,
  error: paleta.coral,
  successBg: paleta.oliva,
  decisionBg: paleta.crema,
  onDecision: paleta.esmeraldaNegro,
  onDecisionMuted: paleta.musgo,
  onDecisionAccent: paleta.oliva,
  decisionSurface: "rgba(2,17,12,0.07)",
  scrim: paleta.bosqueProfundo,
  scrimOverlay: "rgba(5,31,32,0.55)",
  scrimSurface: "rgba(243,235,214,0.12)",
  onScrim: paleta.crema,
  onScrimMuted: paleta.liquen,
  backdrop: "rgba(2,17,12,0.6)",
  transparent: "transparent",
};

/** Los dos temas como valores planos (los usan los tests de contraste). */
export const temas = { claro, oscuro } as const;

/**
 * Colores por rol. Cada lectura devuelve el valor del tema activo (en iOS, un color dinámico que
 * resuelve el sistema).
 */
export const colors: Readonly<Record<Rol, ColorValue>> = Object.defineProperties(
  {},
  Object.fromEntries(
    (Object.keys(claro) as Rol[]).map((rol) => [
      rol,
      { enumerable: true, get: () => colorPorTema(rol, claro[rol], oscuro[rol]) },
    ]),
  ),
) as Record<Rol, ColorValue>;

export type ColorToken = Rol;

/**
 * Colores fijos del QR de invitación: oscuro sobre claro en los dos temas, porque muchos lectores
 * no leen un QR invertido.
 */
export const qrColors = { ink: claro.ink, fondo: claro.canvas } as const;

type EstadoTope = "disponible" | "queda-poco" | "agotado" | "sin-base";

/** Estado del tope → color de barra y de texto (DESIGN.md §5, indicador de tope). */
export const topeColors: Readonly<Record<EstadoTope, { readonly bar: ColorValue; readonly text: ColorValue }>> = {
  disponible: { get bar() { return colors.accent; }, get text() { return colors.inkSecondary; } },
  "queda-poco": { get bar() { return colors.warning; }, get text() { return colors.warning; } },
  agotado: { get bar() { return colors.error; }, get text() { return colors.error; } },
  "sin-base": { get bar() { return colors.divider; }, get text() { return colors.inkSecondary; } },
};

/** Única sombra permitida: elementos flotantes (tab bar, toast). En oscuro casi no se ve: ahí separa el tono. */
export const floatingShadow = "0 8px 24px rgba(2,17,12,0.10)";

export const fonts = {
  regular: "HankenGrotesk_400Regular",
  medium: "HankenGrotesk_500Medium",
  semibold: "HankenGrotesk_600SemiBold",
  bold: "HankenGrotesk_700Bold",
} as const;

export type FontWeight = keyof typeof fonts;

/** Escala de DESIGN.md §3. Tamaños en pt; escalan con Dynamic Type (no se bloquea). */
export const type = {
  display: { fontSize: 40, lineHeight: 44, letterSpacing: -0.8, weight: "bold" },
  titleLg: { fontSize: 28, lineHeight: 32, letterSpacing: -0.28, weight: "bold" },
  titleMd: { fontSize: 20, lineHeight: 26, letterSpacing: 0, weight: "semibold" },
  bodyLg: { fontSize: 17, lineHeight: 24, letterSpacing: 0, weight: "regular" },
  bodyMd: { fontSize: 15, lineHeight: 22, letterSpacing: 0, weight: "regular" },
  label: { fontSize: 13, lineHeight: 18, letterSpacing: 0, weight: "medium" },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.48, weight: "medium" },
} as const satisfies Record<
  string,
  { fontSize: number; lineHeight: number; letterSpacing: number; weight: FontWeight }
>;

export type TypeVariant = keyof typeof type;

/**
 * Tope de escala por nivel con Dynamic Type. El texto escala siempre, pero a los tamaños
 * de accesibilidad (hasta ×3,1 en iOS) los títulos y cifras grandes se frenan antes para
 * no cortar palabras al medio (verificado en el simulador con el texto más grande).
 */
export const maxFontScale: Record<TypeVariant, number> = {
  display: 1.4,
  titleLg: 1.6,
  titleMd: 1.8,
  bodyLg: 2,
  bodyMd: 2,
  label: 2,
  caption: 2,
};

/** Grilla de 4 pt. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
  /** Margen lateral de pantalla. */
  gutter: 20,
} as const;

/**
 * DESIGN.md v7 §4: una sola familia de rectángulos redondeados (referencias 14, 17, 19 y 26).
 * Tarjetas 20, cuadrados de comercio 16, botones, campos y chips 14, filas 12. La píldora queda
 * solo para la cápsula de la tab bar y lo que es un círculo (avatares, radios, barras).
 */
export const radius = {
  card: 20,
  tile: 16,
  control: 14,
  row: 12,
  badge: 8,
  sheet: 28,
  pill: 999,
} as const;

export const size = {
  /** Área táctil mínima (HIG). */
  hit: 44,
  primaryButton: 56,
  chip: 40,
  rowMin: 64,
  /** Círculo de la fila de comercios de Inicio (DESIGN.md §5). */
  comercio: 56,
  avatar: 40,
  icon: 24,
} as const;

/** Escala de texto a partir de la cual las grillas de 2 columnas pasan a 1 (auditoría P2 #17). */
export const ONE_COLUMN_FONT_SCALE = 1.2;
