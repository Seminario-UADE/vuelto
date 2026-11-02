import { useEffect } from "react";
import { AppState } from "react-native";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { vaciarCola } from "@/store/thunks";

/**
 * Pide subir lo pendiente cuando la app vuelve a primer plano y cuando cambia la cuenta
 * (spec 010, FR-005). El arranque lo pide `iniciarCompras()`. Con la subida desconectada,
 * `vaciarCola` no hace nada.
 */
export function useSubidaDeCompras() {
  const dispatch = useAppDispatch();
  const cuenta = useAppSelector((s) => s.sesion.cuenta);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (estado) => {
      if (estado === "active") void dispatch(vaciarCola());
    });
    return () => sub.remove();
  }, [dispatch]);

  useEffect(() => {
    void dispatch(vaciarCola());
  }, [cuenta, dispatch]);
}
