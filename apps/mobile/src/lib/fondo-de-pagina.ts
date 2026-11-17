import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Platform, type ColorValue } from "react-native";

/** Lo mínimo del DOM que se toca: el proyecto compila sin los tipos de `lib.dom`. */
type Documento = { documentElement: { style: { backgroundColor: string } }; body: { style: { backgroundColor: string } } };

/**
 * Solo web: pinta el fondo de la página (`html` y `body`) del color de lo que hay arriba de la
 * pantalla mientras está en foco.
 *
 * En la web app instalada del iPhone (iOS 26), el sistema dibuja la barra de estado como un degradé
 * con el color de fondo de la página. Con un panel oscuro arriba y la página clara, ese degradé se ve
 * como una neblina clara sobre el panel. Con el fondo del mismo color que el panel desaparece y la
 * barra queda integrada. Al salir de la pantalla vuelve al fondo del tema (`public/index.html`).
 *
 * En iOS y Android nativos no hace nada: ahí no hay página.
 */
export function useFondoDePagina(color: ColorValue): void {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "web" || typeof color !== "string") return;
      const documento = (globalThis as { document?: Documento }).document;
      if (!documento) return;
      documento.documentElement.style.backgroundColor = color;
      documento.body.style.backgroundColor = color;
      return () => {
        documento.documentElement.style.backgroundColor = "";
        documento.body.style.backgroundColor = "";
      };
    }, [color]),
  );
}
