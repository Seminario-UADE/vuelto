import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

/**
 * Alto del teclado en pantalla, para dejar ese espacio libre al final de una lista que se desplaza
 * (issue #128). Solo en Android: con la pantalla de borde a borde el sistema ya no achica la ventana
 * y el teclado tapa el final del contenido. En iOS lo hace `automaticallyAdjustKeyboardInsets`.
 */
export function useAlturaTeclado(): number {
  const [alto, setAlto] = useState(0);
  useEffect(() => {
    if (process.env.EXPO_OS === "ios") return;
    const mostrar = Keyboard.addListener("keyboardDidShow", (e) => setAlto(e.endCoordinates.height));
    const ocultar = Keyboard.addListener("keyboardDidHide", () => setAlto(0));
    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, []);
  return alto;
}
