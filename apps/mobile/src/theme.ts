import type { ColorValue } from "react-native";
import { colorPorTema } from "./theme-color";

/**
 * Tema de Vuelto: el ÚNICO archivo de la app con colores escritos a mano.
 *
 * Valores de docs/design/DESIGN.md v10 §2–§4. Los nombres son roles (semánticos), no colores:
 * cada rol tiene un valor en el tema claro y otro en el oscuro, compuestos por separado (el oscuro
 * no es la inversión del claro). La app sigue la apariencia del sistema
 * (`userInterfaceStyle: "automatic"`).
 *
 * Las pantallas leen `colors.<rol>` como siempre. En iOS cada rol es un `DynamicColorIOS`: el
 * sistema lo resuelve y lo cambia solo al pasar a oscuro, sin re-render. En Android y web el valor
 * sale del esquema que fija `TemaProvider` (ver `theme-color.ts`).
 */

const paleta = {
  // v9.1: los seis verdes de la referencia del equipo, de lo más hondo a lo más claro. Todo el
  // tema sale de acá; lo que no está (advertencia, error, info, rubros) es semántico y aparte.
  noche: "#051F20",
  pino: "#0B2B26",
  musgo: "#163832",
  helecho: "#235347",
  salvia: "#8EB69B",
  menta: "#DAF1DE",
  // v10: neutros con un dejo verde. El verde de la marca vive en el panel y en la acción, no en las
  // superficies. Claro: niebla verdosa y tarjetas casi blancas.
  nieblaFondo: "#F2F6F3",
  nieblaTarjeta: "#FCFEFD",
  nieblaHundida: "#E4ECE7",
  divisorClaro: "#D5E0D9",
  tintaClara: "#0B1A14",
  textoSecundarioClaro: "#4A6157",
  bordeControlClaro: "#6F857B",
  /** Acción del claro: helecho con más vida, sigue en AA sobre todas las superficies. */
  bosque: "#1C6B4E",
  sobreBosque: "#F4FAF6",
  // Oscuro: casi negro con un dejo verde, sin cambio de matiz entre niveles.
  carbon: "#0B100E",
  carbonTarjeta: "#141B18",
  carbonHundido: "#1D2622",
  divisorOscuro: "#27322D",
  nube: "#E6F1EA",
  textoSecundarioOscuro: "#9AADA3",
  /** Acción del oscuro: la salvia con luz (la v9.1 se leía como deshabilitada). */
  brote: "#7DD3A0",
  sobreBrote: "#06130D",
  /** Brillo del panel de Inicio, en los dos temas. */
  brillo: "#1F5A45",
  /** Borde del panel en el claro: el panel queda oscuro en los dos temas. */
  panelClaro: "#0E2A21",
  /** Decisión en el oscuro: verde hondo en vez de la menta encandilante de la v9.1. */
  decisionOscura: "#0F2019",
  decisionOscuraMuted: "#A3C2B0",
  exitoFondoOscuro: "#1C3A2E",
  /** Texto atenuado sobre el panel (helecho): la salvia no llega a AA ahí. */
  salviaClara: "#B9D6C2",
  bordeControlOscuro: "#64766D",
  // Semánticos. Claro
  ambarClaro: "#985A00",
  ambarFondoClaro: "#FCEFD8",
  rojoClaro: "#B42A22",
  hojaClara: "#1D6B44",
  azulClaro: "#1E62A6",
  azulFondoClaro: "#DFEBF7",
  rubroSuperClaro: "#1D7543",
  rubroSuperFondoClaro: "#DDF2E4",
  rubroCombustibleClaro: "#A0500F",
  rubroCombustibleFondoClaro: "#FBE7D4",
  rubroGastroClaro: "#A6334E",
  rubroGastroFondoClaro: "#F9DFE5",
  rubroHogarClaro: "#4A53A6",
  rubroHogarFondoClaro: "#E2E5F8",
  // Semánticos. Oscuro
  ambar: "#E8BC66",
  ambarOscuro: "#2B2410",
  coral: "#F09488",
  hojaOscura: "#9BD8AE",
  lagoClaro: "#86C8D0",
  lagoOscuro: "#17484C",
  rubroSuperOscuro: "#9CCB9F",
  rubroSuperFondoOscuro: "#1F4A36",
  rubroCombustibleOscuro: "#F0A66B",
  rubroCombustibleFondoOscuro: "#4A2F1A",
  rubroGastroOscuro: "#E79AAB",
  rubroGastroFondoOscuro: "#4A2531",
  rubroHogarOscuro: "#A5B8E0",
  rubroHogarFondoOscuro: "#27345A",
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
  | "success"
  | "accent2"
  | "accent2Bg"
  | "heroBg"
  | "heroBgHi"
  | "heroSurface"
  | "onHero"
  | "onHeroMuted"
  | "heroAccent"
  | "onHeroAccent"
  | "rubroSuper"
  | "rubroSuperBg"
  | "rubroFarmacia"
  | "rubroFarmaciaBg"
  | "rubroCombustible"
  | "rubroCombustibleBg"
  | "rubroGastro"
  | "rubroGastroBg"
  | "rubroHogar"
  | "rubroHogarBg"
  | "decisionBg"
  | "onDecision"
  | "onDecisionMuted"
  | "onDecisionAccent"
  | "onDecisionAccentInk"
  | "decisionSurface"
  | "scrim"
  | "scrimOverlay"
  | "scrimSurface"
  | "onScrim"
  | "onScrimMuted"
  | "backdrop"
  | "transparent";

export type Tema = Readonly<Record<Rol, string>>;

/** Tema claro (v10): niebla verdosa y tinta casi negra; la acción en bosque. El panel y la decisión, oscuros. */
const claro: Tema = {
  /** Fondo de todas las pantallas. */
  canvas: paleta.nieblaFondo,
  /** Tarjetas y listas agrupadas: lo más claro, con sombra suave. */
  surface: paleta.nieblaTarjeta,
  /** Campos, segmentos, círculos de comercio, fila seleccionada: hundidos respecto del fondo. */
  surfaceStrong: paleta.nieblaHundida,
  /** Líneas divisorias. Nunca como único borde de un control. */
  divider: paleta.divisorClaro,
  /** Texto principal e íconos. */
  ink: paleta.tintaClara,
  /** Texto secundario y metadatos. */
  inkSecondary: paleta.textoSecundarioClaro,
  /** Borde de radios, checkboxes e inputs no seleccionados. */
  controlBorder: paleta.bordeControlClaro,
  /** Único acento de acción: primario, selección, tab activa, progreso, links. */
  accent: paleta.bosque,
  /** Texto e íconos sobre `accent`. */
  onAccent: paleta.sobreBosque,
  /** Advertencia (queda poco, otro día). Siempre con texto o ícono. */
  warning: paleta.ambarClaro,
  warningBg: paleta.ambarFondoClaro,
  /** Agotado, error de lectura. */
  error: paleta.rojoClaro,
  /** Confirmación y fondo del ahorro (con texto `ink`). */
  successBg: paleta.menta,
  /** Texto de lo que se ganó o se devolvió. */
  success: paleta.hojaClara,
  /** Segundo acento: información y estimaciones; nunca reemplaza a `accent` en acciones. */
  accent2: paleta.azulClaro,
  accent2Bg: paleta.azulFondoClaro,
  /** Panel de Inicio (v10): brillo verde arriba al centro que se funde hacia el borde; oscuro en los dos temas. */
  heroBg: paleta.panelClaro,
  heroBgHi: paleta.brillo,
  heroSurface: "rgba(230,241,234,0.12)",
  onHero: paleta.nube,
  onHeroMuted: paleta.salviaClara,
  /** Atajo principal del panel («Con qué pago»): brote en los dos temas, porque el panel es oscuro en los dos. */
  heroAccent: paleta.brote,
  onHeroAccent: paleta.sobreBrote,
  /** Color por rubro: ícono y fondo del cuadrado de comercio. */
  rubroSuper: paleta.rubroSuperClaro,
  rubroSuperBg: paleta.rubroSuperFondoClaro,
  rubroFarmacia: paleta.azulClaro,
  rubroFarmaciaBg: paleta.azulFondoClaro,
  rubroCombustible: paleta.rubroCombustibleClaro,
  rubroCombustibleBg: paleta.rubroCombustibleFondoClaro,
  rubroGastro: paleta.rubroGastroClaro,
  rubroGastroBg: paleta.rubroGastroFondoClaro,
  rubroHogar: paleta.rubroHogarClaro,
  rubroHogarBg: paleta.rubroHogarFondoClaro,
  /** Tarjeta de decisión: la única superficie invertida. */
  decisionBg: paleta.noche,
  onDecision: paleta.menta,
  /** Razón y base sobre la decisión. */
  onDecisionMuted: paleta.salvia,
  /** Botón «Usar [medio]», inicial del medio y detalles sobre la decisión (texto encima: `onDecisionAccentInk`). */
  onDecisionAccent: paleta.salvia,
  /** Texto e íconos sobre `onDecisionAccent` (botón «Usar [medio]», inicial del medio). */
  onDecisionAccentInk: paleta.tintaClara,
  /** Superficie secundaria dentro de la decisión (campo de monto, pista de la barra). */
  decisionSurface: "rgba(218,241,222,0.10)",
  /** Visor de cámara (Escanear ticket): oscuro en los dos temas. */
  scrim: paleta.noche,
  scrimOverlay: "rgba(5,31,32,0.55)",
  scrimSurface: "rgba(218,241,222,0.12)",
  onScrim: paleta.menta,
  onScrimMuted: paleta.salvia,
  /** Velo detrás de los sheets (lo dibuja el sistema; se usa en web). */
  backdrop: "rgba(5,31,32,0.35)",
  transparent: "transparent",
};

/** Tema oscuro (v10): carbón con un dejo verde, texto nube y acción brote. La decisión, en verde hondo. */
const oscuro: Tema = {
  canvas: paleta.carbon,
  surface: paleta.carbonTarjeta,
  surfaceStrong: paleta.carbonHundido,
  divider: paleta.divisorOscuro,
  ink: paleta.nube,
  inkSecondary: paleta.textoSecundarioOscuro,
  controlBorder: paleta.bordeControlOscuro,
  accent: paleta.brote,
  onAccent: paleta.sobreBrote,
  warning: paleta.ambar,
  warningBg: paleta.ambarOscuro,
  error: paleta.coral,
  successBg: paleta.exitoFondoOscuro,
  success: paleta.hojaOscura,
  accent2: paleta.lagoClaro,
  accent2Bg: paleta.lagoOscuro,
  heroBg: paleta.carbon,
  heroBgHi: paleta.brillo,
  heroSurface: "rgba(230,241,234,0.12)",
  onHero: paleta.nube,
  onHeroMuted: paleta.salviaClara,
  heroAccent: paleta.brote,
  onHeroAccent: paleta.sobreBrote,
  rubroSuper: paleta.rubroSuperOscuro,
  rubroSuperBg: paleta.rubroSuperFondoOscuro,
  rubroFarmacia: paleta.lagoClaro,
  rubroFarmaciaBg: paleta.lagoOscuro,
  rubroCombustible: paleta.rubroCombustibleOscuro,
  rubroCombustibleBg: paleta.rubroCombustibleFondoOscuro,
  rubroGastro: paleta.rubroGastroOscuro,
  rubroGastroBg: paleta.rubroGastroFondoOscuro,
  rubroHogar: paleta.rubroHogarOscuro,
  rubroHogarBg: paleta.rubroHogarFondoOscuro,
  decisionBg: paleta.decisionOscura,
  onDecision: paleta.nube,
  onDecisionMuted: paleta.decisionOscuraMuted,
  onDecisionAccent: paleta.brote,
  onDecisionAccentInk: paleta.sobreBrote,
  decisionSurface: "rgba(5,31,32,0.07)",
  scrim: paleta.noche,
  scrimOverlay: "rgba(5,31,32,0.55)",
  scrimSurface: "rgba(218,241,222,0.12)",
  onScrim: paleta.menta,
  onScrimMuted: paleta.salvia,
  backdrop: "rgba(4,8,6,0.6)",
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

/** Sombra de lo que flota (tab bar, toast). En oscuro casi no se ve: ahí separa el tono. */
export const floatingShadow = "0 8px 24px rgba(5,31,32,0.10)";

/**
 * Elevación (DESIGN.md v9 §4). En el claro las tarjetas se despegan del fondo con una sombra suave;
 * en el oscuro lo elevado es más claro y no lleva sombra. Nunca borde y sombra juntos.
 */
export const sombras = {
  claro: {
    tarjeta: "0 1px 2px rgba(5,31,32,0.05), 0 6px 16px rgba(5,31,32,0.07)",
    cabecera: "0 10px 24px rgba(5,31,32,0.25)",
  },
  oscuro: { tarjeta: undefined, cabecera: undefined },
} as const;

type RubroDeColor = "supermercado" | "gastronomia" | "indumentaria" | "farmacia" | "combustible" | "hogar" | "otro";

/** Rubro → color del ícono y de su cuadrado (v8). `otro` queda neutro: ni gris ni de color. */
export const rubroColors: Readonly<Record<RubroDeColor, { readonly fg: ColorValue; readonly bg: ColorValue }>> = {
  supermercado: { get fg() { return colors.rubroSuper; }, get bg() { return colors.rubroSuperBg; } },
  gastronomia: { get fg() { return colors.rubroGastro; }, get bg() { return colors.rubroGastroBg; } },
  indumentaria: { get fg() { return colors.rubroHogar; }, get bg() { return colors.rubroHogarBg; } },
  farmacia: { get fg() { return colors.rubroFarmacia; }, get bg() { return colors.rubroFarmaciaBg; } },
  combustible: { get fg() { return colors.rubroCombustible; }, get bg() { return colors.rubroCombustibleBg; } },
  hogar: { get fg() { return colors.rubroHogar; }, get bg() { return colors.rubroHogarBg; } },
  otro: { get fg() { return colors.inkSecondary; }, get bg() { return colors.surfaceStrong; } },
};

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
 * DESIGN.md v8 §4: una sola familia de rectángulos redondeados. Tarjetas y barra de pestañas 20,
 * cuadrados de comercio 16, botones, campos y segmentos 14, filas 12, cabecera de Inicio 28 (`sheet`).
 * La píldora queda solo para lo que es un círculo (avatares, radios, barras de progreso).
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
