import { colors, fonts } from "@/theme";

/**
 * Header nativo del stack: back y swipe del sistema (auditoría P1 #6). Los colores son getters para
 * que, al esparcirlo en un render, tomen el tema activo (en Android y web no hay colores dinámicos).
 */
export const headerNativo = {
  headerShown: true,
  get headerTintColor() {
    return colors.ink;
  },
  get headerStyle() {
    return { backgroundColor: colors.canvas };
  },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: "minimal" as const,
  get headerTitleStyle() {
    return { fontFamily: fonts.semibold, color: colors.ink };
  },
  get contentStyle() {
    return { backgroundColor: colors.canvas };
  },
};
