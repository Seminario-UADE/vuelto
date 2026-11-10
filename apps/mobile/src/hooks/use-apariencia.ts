import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Appearance } from "react-native";
import { CLAVE_APARIENCIA, esquemaParaElSistema, leerPreferencia } from "@/lib/apariencia";
import { preferenciaCambiada } from "@/store/apariencia";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * Capa imperativa del tema: lee la preferencia guardada al abrir, la guarda cuando cambia y se la
 * pasa al sistema operativo (en iOS los colores son dinámicos y siguen su apariencia). En la web
 * `Appearance.setColorScheme` no existe: ahí manda `TemaProvider`, que resuelve el esquema con la
 * preferencia del store. Devuelve `true` cuando ya se leyó lo guardado (evita un parpadeo).
 */
export function useApariencia(): boolean {
  const dispatch = useAppDispatch();
  const preferencia = useAppSelector((s) => s.apariencia.preferencia);
  const [leida, setLeida] = useState(false);

  useEffect(() => {
    let vivo = true;
    AsyncStorage.getItem(CLAVE_APARIENCIA)
      .then((guardado) => {
        if (vivo) dispatch(preferenciaCambiada(leerPreferencia(guardado)));
      })
      .catch(() => {})
      .finally(() => {
        if (vivo) setLeida(true);
      });
    return () => {
      vivo = false;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!leida) return;
    if (typeof Appearance.setColorScheme === "function") {
      Appearance.setColorScheme(esquemaParaElSistema(preferencia));
    }
    AsyncStorage.setItem(CLAVE_APARIENCIA, preferencia).catch(() => {});
  }, [leida, preferencia]);

  return leida;
}
