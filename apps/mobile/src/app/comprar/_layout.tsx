import { Stack } from "expo-router";
import { useTema } from "@/components/tema-provider";

/**
 * Flujo de compra del «+» (DESIGN.md v7 §5): un paso por pantalla. 1 comercio → 2 monto →
 * 3 recomendación → 4 «Pagá con…» y confirmar. Cada paso dibuja su encabezado (`Paso`).
 */
export default function ComprarLayout() {
  const t = useTema();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.canvas } }} />;
}
