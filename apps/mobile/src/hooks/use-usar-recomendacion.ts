import { useCallback } from "react";
import { hapticoExito } from "@/lib/haptics";
import { useAppDispatch } from "@/store/hooks";
import { avisoMostrado } from "@/store/sesion";
import { usarRecomendacion } from "@/store/thunks";

/**
 * «Usar [medio]» desde Inicio o desde el detalle del comercio (spec 012, FR-002, FR-004): deja
 * la compra por confirmar y avisa con los textos de `contracts/rutas.md`. Devuelve si la creó.
 */
export function useUsarRecomendacion(): () => boolean {
  const dispatch = useAppDispatch();
  return useCallback(
    () => {
      const r = dispatch(usarRecomendacion());
      if (r === null) return false;
      hapticoExito();
      dispatch(
        avisoMostrado(
          r.reemplazo
            ? `Actualizamos tu compra en ${r.porConfirmar.comercioNombre}.`
            : `Pagá con ${r.medioNombre}. Cuando pagues, confirmala.`,
        ),
      );
      return true;
    },
    [dispatch],
  );
}
