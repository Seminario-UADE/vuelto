import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { recomendacionVista } from "../data/calculo";
import type { Recomendacion } from "../data/contracts";
import { catalogoComercios } from "../data/fixtures";
import type { AppDispatch, RootState } from "./index";
import { selectEntradasMotor } from "./selectores";

export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/**
 * La recomendación para un comercio y un monto que no son los de la simulación (Revisá tu
 * compra, Primera respuesta): misma función que `selectRecomendacion`, memoizada con las
 * mismas entradas del motor, sin tocar lo que la pantalla de abajo está simulando.
 */
export function useRecomendacionPara(comercioId: string | null, monto: number | null): Recomendacion | null {
  const entradas = useAppSelector(selectEntradasMotor);
  return useMemo(() => {
    const comercio = catalogoComercios.find((c) => c.id === comercioId);
    return comercio ? recomendacionVista(entradas, comercio, monto) : null;
  }, [entradas, comercioId, monto]);
}
