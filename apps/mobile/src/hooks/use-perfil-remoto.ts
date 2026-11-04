import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { leerMedios } from "@/store/perfil-remoto";

/**
 * Lee los medios del usuario en Supabase al abrir la app (una vez leído lo guardado) y cada vez que
 * entra una cuenta (issue #41, T009). Sin sesión o sin Supabase, `leerMedios` no hace nada.
 */
export function usePerfilRemoto(): void {
  const dispatch = useAppDispatch();
  const hidratado = useAppSelector((s) => s.sesion.hidratado);
  const usuarioId = useAppSelector((s) => s.sesion.usuario?.id ?? null);

  useEffect(() => {
    if (hidratado && usuarioId !== null) void dispatch(leerMedios());
  }, [dispatch, hidratado, usuarioId]);
}
