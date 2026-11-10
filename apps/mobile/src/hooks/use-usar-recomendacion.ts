import { useCallback } from "react";
import { hapticoExito } from "@/lib/haptics";
import { useAppDispatch } from "@/store/hooks";
import { avisoMostrado } from "@/store/sesion";
import { usarRecomendacion } from "@/store/thunks";

/**
 * «Voy a pagar con [medio]» (spec 012, FR-002): deja la compra por confirmar y devuelve su id,
 * o `null` si no se pudo crear. Solo avisa si reemplazó otra en el mismo comercio (FR-012): el
 * paso siguiente ya dice con qué pagar.
 */
export function useUsarRecomendacion(): () => string | null {
  const dispatch = useAppDispatch();
  return useCallback(() => {
    const r = dispatch(usarRecomendacion());
    if (r === null) return null;
    hapticoExito();
    if (r.reemplazo) dispatch(avisoMostrado(`Actualizamos tu compra en ${r.porConfirmar.comercioNombre}.`));
    return r.porConfirmar.id;
  }, [dispatch]);
}
