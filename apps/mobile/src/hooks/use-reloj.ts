import { useEffect } from "react";
import { AppState } from "react-native";
import { RELOJ_EJEMPLO } from "@/data/fixtures";
import { msHastaLaMedianoche } from "@/lib/reloj";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { ahoraCambio } from "@/store/sesion";

/**
 * Con los datos de ejemplo (compras de octubre de 2026) la fuente es el reloj fijo: con el real, las
 * compras de ejemplo quedarían fuera del período. Con un corpus sincronizado (`corpus.marca` no
 * nula, spec 009 FR-016) la fuente es el reloj real. Las dos son funciones estables, así el efecto
 * solo se re-ejecuta cuando cambia la fuente.
 */
const relojDeEjemplo = () => new Date(RELOJ_EJEMPLO);
const relojReal = () => new Date();

/**
 * Capa imperativa del reloj (spec 008 FR-006): escribe `sesion.ahora` al abrir la app, al
 * volver a primer plano y a cada medianoche de Argentina. Los selectores solo leen ese valor.
 */
export function useReloj(fuenteForzada?: () => Date): void {
  const dispatch = useAppDispatch();
  const sincronizado = useAppSelector((s) => s.corpus.marca !== null);
  const fuente = fuenteForzada ?? (sincronizado ? relojReal : relojDeEjemplo);
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
