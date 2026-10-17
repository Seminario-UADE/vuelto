import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import type { SFSymbol } from "sf-symbols-typescript";
import type { Rubro } from "@/data/contracts";
import { colors, size as tamanos } from "@/theme";

type Material = ComponentProps<typeof MaterialIcons>["name"];

/**
 * Nombres semánticos → SF Symbol (iOS) y Material (Android y web). Un solo lugar para que
 * el mismo rubro tenga siempre el mismo ícono (DESIGN.md §5, auditoría P1 #6).
 */
const ICONOS = {
  inicio: { sf: "house", sfActivo: "house.fill", md: "home" },
  comprar: { sf: "bag", sfActivo: "bag.fill", md: "shopping-bag" },
  topes: { sf: "chart.pie", sfActivo: "chart.pie.fill", md: "pie-chart" },
  perfil: { sf: "person", sfActivo: "person.fill", md: "person" },
  supermercado: { sf: "cart", md: "shopping-cart" },
  combustible: { sf: "fuelpump", md: "local-gas-station" },
  gastronomia: { sf: "fork.knife", md: "restaurant" },
  farmacia: { sf: "cross.case", md: "local-pharmacy" },
  indumentaria: { sf: "tshirt", md: "checkroom" },
  hogar: { sf: "hammer", md: "handyman" },
  buscar: { sf: "magnifyingglass", md: "search" },
  camara: { sf: "camera", md: "photo-camera" },
  teclado: { sf: "keyboard", md: "keyboard" },
  cerrar: { sf: "xmark", md: "close" },
  chevron: { sf: "chevron.right", md: "chevron-right" },
  chevronAbajo: { sf: "chevron.down", md: "expand-more" },
  check: { sf: "checkmark", md: "check" },
  checkCirculo: { sf: "checkmark.circle.fill", md: "check-circle" },
  info: { sf: "info.circle", md: "info-outline" },
  editar: { sf: "pencil", md: "edit" },
  candado: { sf: "lock", md: "lock" },
  bloqueo: { sf: "nosign", md: "block" },
  agregar: { sf: "plus", md: "add" },
  compartir: { sf: "square.and.arrow.up", md: "share" },
  copiar: { sf: "doc.on.doc", md: "content-copy" },
  qr: { sf: "qrcode", md: "qr-code" },
  grupo: { sf: "person.2", md: "group" },
  invitar: { sf: "person.badge.plus", md: "person-add" },
  calendario: { sf: "calendar", md: "calendar-today" },
  consejo: { sf: "lightbulb", md: "lightbulb-outline" },
  reloj: { sf: "clock", md: "schedule" },
  link: { sf: "link", md: "link" },
  salir: { sf: "rectangle.portrait.and.arrow.right", md: "logout" },
  flecha: { sf: "arrow.right", md: "arrow-forward" },
  comercio: { sf: "storefront", md: "storefront" },
  privacidad: { sf: "lock.shield", md: "privacy-tip" },
  recargar: { sf: "arrow.clockwise", md: "refresh" },
  galeria: { sf: "photo.on.rectangle", md: "photo-library" },
  ticket: { sf: "doc.text", md: "receipt-long" },
  devolvieron: { sf: "arrow.up.right", md: "north-east" },
  quitar: { sf: "minus.circle", md: "remove-circle-outline" },
} as const satisfies Record<string, { sf: SFSymbol; sfActivo?: SFSymbol; md: Material }>;

export type IconName = keyof typeof ICONOS;

export const iconoDeRubro: Record<Rubro, IconName> = {
  supermercado: "supermercado",
  combustible: "combustible",
  gastronomia: "gastronomia",
  farmacia: "farmacia",
  indumentaria: "indumentaria",
  hogar: "hogar",
};

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  /** Variante rellena (ítem activo de la tab bar). */
  activo?: boolean;
  /** Etiqueta para lectores de pantalla. Sin etiqueta, el ícono es decorativo. */
  label?: string;
};

export function Icon({ name, size = tamanos.icon, color = colors.ink, activo, label }: Props) {
  const def = ICONOS[name];
  const a11y = label
    ? { accessible: true, accessibilityLabel: label, accessibilityRole: "image" as const }
    : { accessible: false, importantForAccessibility: "no-hide-descendants" as const };
  if (process.env.EXPO_OS === "ios") {
    const sf = activo && "sfActivo" in def ? def.sfActivo : def.sf;
    return <SymbolView name={sf} size={size} tintColor={color} weight="regular" {...a11y} />;
  }
  return <MaterialIcons name={def.md} size={size} color={color} {...a11y} />;
}
