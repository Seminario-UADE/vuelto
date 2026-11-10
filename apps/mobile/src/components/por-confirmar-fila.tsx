import { router } from "expo-router";
import { antiguedad, type CompraPorConfirmar } from "@/data/por-confirmar";
import { pesos } from "@/lib/format";
import { useAppSelector } from "@/store/hooks";
import { selectMediosDelUsuario } from "@/store/selectores";
import { Avatar } from "./avatar";
import { FilaAccion } from "./fila-accion";

/**
 * Una compra por confirmar como fila de Inicio (DESIGN.md v7): comercio, monto, con qué pagar y
 * hace cuánto. Tocarla abre el paso 4 del flujo («Pagá con…»), donde está la única acción de
 * confirmar (escanear o a mano) y descartar.
 */
export function PorConfirmarFila({ c }: { c: CompraPorConfirmar }) {
  const medios = useAppSelector(selectMediosDelUsuario);
  const ahora = useAppSelector((s) => s.sesion.ahora);
  const medio = medios.find((m) => m.id === c.medioId);
  const titulo = [c.comercioNombre, c.monto !== null ? pesos(c.monto) : null].filter(Boolean).join(" · ");
  return (
    <FilaAccion
      leading={<Avatar letras={medio?.inicial ?? c.comercioNombre.charAt(0)} tone="activo" forma="cuadrado" />}
      titulo={titulo}
      detalle={`${medio ? `Con ${medio.nombreCorto}` : "Sin medio"} · ${antiguedad(c, ahora)}`}
      valor="Confirmar"
      onPress={() => router.push({ pathname: "/comprar/pagar", params: { id: c.id } })}
    />
  );
}
