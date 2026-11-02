import { useEffect, useMemo, useState } from "react";

type Resultado<T> = { pedido: object | null; datos: T | null; error: string | null };

export type Carga<T> = {
  estado: "cargando" | "listo" | "error";
  datos: T | null;
  error: string | null;
  recargar: () => void;
};

/**
 * Carga datos de `src/data/api.ts` y vuelve a cargar cuando cambia `clave`. Conserva los datos anteriores mientras recarga (para
 * no parpadear al cambiar el monto) y expone `recargar` para reintentar.
 */
export function useAsync<T>(fn: () => Promise<T>, clave: string | number | null = null): Carga<T> {
  const [intento, setIntento] = useState(0);
  // Cada `clave` + intento es un pedido distinto; `fn` se toma del render que lo pidió.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pedido = useMemo(() => ({ fn }), [clave, intento]);
  const [res, setRes] = useState<Resultado<T>>({ pedido: null, datos: null, error: null });

  useEffect(() => {
    let vigente = true;
    pedido
      .fn()
      .then((datos) => {
        if (vigente) setRes({ pedido, datos, error: null });
      })
      .catch((e: unknown) => {
        if (vigente) {
          setRes((prev) => ({
            pedido,
            datos: prev.datos,
            error: e instanceof Error ? e.message : "Algo salió mal. Probá de nuevo.",
          }));
        }
      });
    return () => {
      vigente = false;
    };
  }, [pedido]);

  const actual = res.pedido === pedido;
  return {
    estado: !actual ? "cargando" : res.error ? "error" : "listo",
    datos: res.datos,
    error: actual ? res.error : null,
    recargar: () => setIntento((x) => x + 1),
  };
}
