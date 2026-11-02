import { useEffect } from "react";
import { AppState } from "react-native";
import { sincronizar } from "@/sync/sincronizar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * Dispara la sincronización (spec 009 FR-001): al abrir la app una vez rehidratado el store, cuando
 * entra un usuario (el login o la sesión que se restaura después de abrir) y cada vez que vuelve a
 * primer plano. La espera de 5 minutos, la exclusión mutua y el timeout viven en el thunk. Sin sesión
 * de Supabase o sin red no hace nada y no muestra error.
 */
export function useSincronizacion(): void {
  const dispatch = useAppDispatch();
  const hidratado = useAppSelector((s) => s.sesion.hidratado);
  const usuarioId = useAppSelector((s) => s.sesion.usuario?.id ?? null);

  useEffect(() => {
    if (hidratado) void dispatch(sincronizar("apertura"));
  }, [dispatch, hidratado, usuarioId]);

  useEffect(() => {
    if (!hidratado) return;
    const sub = AppState.addEventListener("change", (estado) => {
      if (estado === "active") void dispatch(sincronizar("primer-plano"));
    });
    return () => sub.remove();
  }, [dispatch, hidratado]);
}
