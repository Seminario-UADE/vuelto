import { useEffect } from "react";
import { AppState } from "react-native";
import { RELOJ_EJEMPLO } from "@/data/fixtures";
import { msHastaLaMedianoche } from "@/lib/reloj";
import { useAppDispatch } from "@/store/hooks";
import { ahoraCambio } from "@/store/sesion";

/**
 * Con los datos de ejemplo (octubre de 2026) la fuente es el reloj fijo: con el real, las
 * promos estarían vencidas. Cuando #42 traiga el corpus vigente pasa a ser `() => new Date()`.
 */
const relojDeEjemplo = () => new Date(RELOJ_EJEMPLO);

/**
 * Capa imperativa del reloj (spec 007 FR-006): escribe `sesion.ahora` al abrir la app, al
 * volver a primer plano y a cada medianoche de Argentina. Los selectores solo leen ese valor.
 */
export function useReloj(fuente: () => Date = relojDeEjemplo): void {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const marcar = () => dispatch(ahoraCambio(fuente().toISOString()));
    let timer: ReturnType<typeof setTimeout> | null = null;
    const programar = () => {
      timer = setTimeout(() => {
        marcar();
        programar();
      }, msHastaLaMedianoche(fuente()));
    };
    marcar();
    programar();
    const sub = AppState.addEventListener("change", (estado) => {
      if (estado === "active") marcar();
    });
    return () => {
      sub.remove();
      if (timer) clearTimeout(timer);
    };
  }, [dispatch, fuente]);
}
