import { fonts, type Tema } from "@/theme";

/**
 * Header nativo del stack: back y swipe del sistema (auditoría P1 #6). Recibe el tema ya resuelto
 * (`useTema()`): los navegadores nativos toman el color una sola vez y no siguen a un color dinámico
 * cuando cambia la apariencia, así que acá van valores concretos que se recalculan en cada render.
 */
export function headerNativo(t: Tema) {
  return {
    headerShown: true,
    headerTintColor: t.ink,
    headerStyle: { backgroundColor: t.canvas },
    headerShadowVisible: false,
    headerBackButtonDisplayMode: "minimal" as const,
    headerTitleStyle: { fontFamily: fonts.semibold, color: t.ink },
    contentStyle: { backgroundColor: t.canvas },
  };
}
