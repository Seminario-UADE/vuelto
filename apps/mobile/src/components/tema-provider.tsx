import { StatusBar } from "expo-status-bar";
import { createContext, Fragment, use, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { fijarEsquema, temaSeResuelveSolo, type Esquema } from "@/theme-color";

const EsquemaContext = createContext<Esquema>("claro");

/**
 * Único lugar que resuelve el tema (DESIGN.md §2, Apariencia): sigue al sistema con
 * `useColorScheme()` y la `StatusBar` lo acompaña. Las pantallas siguen leyendo `colors` de
 * `@/theme`, sin hooks.
 *
 * En iOS los colores son dinámicos y el sistema los cambia solo. En Android y web el esquema se
 * fija antes de renderizar a los hijos y, si cambia, el árbol se vuelve a montar (`key`) para que
 * ningún estilo quede con el tema anterior.
 */
export function TemaProvider({ children }: { children: ReactNode }) {
  const esquema: Esquema = useColorScheme() === "dark" ? "oscuro" : "claro";
  fijarEsquema(esquema);
  return (
    <EsquemaContext value={esquema}>
      <StatusBar style={esquema === "oscuro" ? "light" : "dark"} />
      <Fragment key={temaSeResuelveSolo ? "tema" : esquema}>{children}</Fragment>
    </EsquemaContext>
  );
}

/** El esquema activo, para lo que no se puede expresar con un rol (p. ej., la barra de estado). */
export function useEsquema(): Esquema {
  return use(EsquemaContext);
}
