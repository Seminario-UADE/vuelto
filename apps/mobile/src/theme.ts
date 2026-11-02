/**
 * Tema de Vuelto: el ÚNICO archivo de la app con colores escritos a mano.
 *
 * Valores de docs/design/DESIGN.md §2–§4. Los nombres son roles (semánticos), no
 * colores: una apariencia oscura futura cambiaría solo este archivo. Hoy la app
 * declara apariencia solo clara (`userInterfaceStyle: "light"`, spec 006 FR-030).
 */

const palette = {
  blancoHueso: "#F7F4EB",
  lino: "#EFEBE0",
  grisCalido: "#E8E4D8",
  divisor: "#DDD8CB",
  verdeBosque: "#14281D",
  musgo: "#52635A",
  bordeControl: "#6A7A70",
  salvia: "#4A6B53",
  champan: "#C5A059",
  ocre: "#83591A",
  ocreClaro: "#F3E6C8",
  oxido: "#8C4843",
  salviaClara: "#DCE6DD",
} as const;

export const colors = {
  /** Fondo de todas las pantallas. */
  canvas: palette.blancoHueso,
  /** Tarjetas y listas agrupadas. */
  surface: palette.lino,
  /** Chips, campos, tarjeta seleccionada. */
  surfaceStrong: palette.grisCalido,
  /** Líneas divisorias. Nunca como único borde de un control. */
  divider: palette.divisor,
  /** Texto principal e íconos. */
  ink: palette.verdeBosque,
  /** Texto secundario y metadatos. */
  inkSecondary: palette.musgo,
  /** Borde de radios, checkboxes e inputs no seleccionados. */
  controlBorder: palette.bordeControl,
  /** Único color de acción: primario, selección, progreso, links. */
  accent: palette.salvia,
  /** Texto e íconos sobre `accent`. */
  onAccent: palette.blancoHueso,
  /** Advertencia (queda poco, otro día). */
  warning: palette.ocre,
  warningBg: palette.ocreClaro,
  /** Agotado, error de lectura. */
  error: palette.oxido,
  /** Confirmación y píldora de ahorro (con texto `ink`). */
  successBg: palette.salviaClara,
  /** Tarjeta de decisión: la única superficie oscura. */
  decisionBg: palette.verdeBosque,
  onDecision: palette.blancoHueso,
  /** Detalles sobre la tarjeta de decisión. Nunca sobre fondo claro. */
  onDecisionAccent: palette.champan,
  /** Superficie secundaria dentro de la tarjeta de decisión. */
  decisionSurface: "rgba(247,244,235,0.10)",
  /** Texto secundario sobre la tarjeta de decisión (blanco hueso al 78%). */
  onDecisionMuted: "rgba(247,244,235,0.78)",
  /** Fondo del visor de cámara (Escanear ticket). */
  scrim: palette.verdeBosque,
  scrimOverlay: "rgba(20,40,29,0.55)",
  /** Velo detrás de los sheets (lo dibuja el sistema; se usa en web). */
  backdrop: "rgba(20,40,29,0.35)",
  transparent: "transparent",
} as const;

export type ColorToken = keyof typeof colors;

/** Estado del tope → color de barra y de texto (DESIGN.md §5, indicador de tope). */
export const topeColors = {
  disponible: { bar: colors.accent, text: colors.inkSecondary },
  "queda-poco": { bar: colors.warning, text: colors.warning },
  agotado: { bar: colors.error, text: colors.error },
  "sin-base": { bar: colors.divider, text: colors.inkSecondary },
} as const;

/** Única sombra permitida: elementos flotantes (tab bar, sheet). */
export const floatingShadow = "0 8px 24px rgba(20,40,29,0.08)";

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

export const radius = {
  card: 20,
  row: 14,
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
  avatar: 40,
  icon: 24,
} as const;

/** Escala de texto a partir de la cual las grillas de 2 columnas pasan a 1 (auditoría P2 #17). */
export const ONE_COLUMN_FONT_SCALE = 1.2;
