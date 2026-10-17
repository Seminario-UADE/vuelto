import * as Haptics from "expo-haptics";

/** Háptico leve al confirmar una compra o elegir un medio (DESIGN.md §7). Solo iOS. */
export function hapticoLeve(): void {
  if (process.env.EXPO_OS === "ios") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function hapticoExito(): void {
  if (process.env.EXPO_OS === "ios") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function hapticoSeleccion(): void {
  if (process.env.EXPO_OS === "ios") void Haptics.selectionAsync();
}
