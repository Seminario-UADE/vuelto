import { useEffect } from "react";
import { AppState } from "react-native";
import { sincronizar } from "@/sync/sincronizar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * Dispara la sincronización (spec 009 FR-001): al abrir la app, una vez rehidratado el store, y cada
 * vez que vuelve a primer plano. La espera de 5 minutos, la exclusión mutua y el timeout viven en el
 * thunk. Sin sesión baja solo el corpus (issue #112); sin red no hace nada y no muestra error.
 */
export function useSincronizacion(): void {
  const dispatch = useAppDispatch();
  const hidratado = useAppSelector((s) => s.sesion.hidratado);
  // Al entrar con otra cuenta se sincroniza enseguida, sin esperar a que la app vuelva a primer plano.
  const usuarioId = useAppSelector((s) => s.sesion.usuario?.id ?? null);

  useEffect(() => {
    if (!hidratado) return;
    void dispatch(sincronizar("apertura"));
    const sub = AppState.addEventListener("change", (estado) => {
      if (estado === "active") void dispatch(sincronizar("primer-plano"));
    });
    return () => sub.remove();
  }, [dispatch, hidratado, usuarioId]);
}
