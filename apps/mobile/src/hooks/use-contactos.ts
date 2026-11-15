import { useEffect } from "react";
import { AppState } from "react-native";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { cargarContactos } from "@/store/contactos";

/**
 * Trae la lista de contactos del servidor al entrar una cuenta y cada vez que la app vuelve a
 * primer plano (spec 013 FR-019): un vínculo creado o quitado desde el otro teléfono aparece solo.
 * Contactos, además, recarga al enfocarse.
 */
export function useContactos(): void {
  const dispatch = useAppDispatch();
  const hidratado = useAppSelector((s) => s.sesion.hidratado);
  const usuarioId = useAppSelector((s) => s.sesion.usuario?.id ?? null);

  useEffect(() => {
    if (!hidratado || usuarioId === null) return;
    void dispatch(cargarContactos());
    const sub = AppState.addEventListener("change", (estado) => {
      if (estado === "active") void dispatch(cargarContactos());
    });
    return () => sub.remove();
  }, [dispatch, hidratado, usuarioId]);
}
