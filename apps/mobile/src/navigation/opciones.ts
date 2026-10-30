import { colors, fonts } from "@/theme";

/** Header nativo del stack: back y swipe del sistema (auditoría P1 #6). */
export const headerNativo = {
  headerShown: true,
  headerTintColor: colors.ink,
  headerStyle: { backgroundColor: colors.canvas },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: "minimal" as const,
  headerTitleStyle: { fontFamily: fonts.semibold, color: colors.ink },
  contentStyle: { backgroundColor: colors.canvas },
};
