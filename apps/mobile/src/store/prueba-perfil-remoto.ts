/** Utilidades de los tests del perfil en Supabase: un `DatosPerfil` en memoria que anota los pedidos. */
import type { DatosPerfil, Resultado } from "../perfil/datos";
import type { MedioDePago, MedioNuevo } from "../perfil/modelo";

export const GALICIA = "88d8705e-2dda-46f9-8411-bb4916af858e";
export const nuevo: MedioNuevo = { bancoId: GALICIA, tipo: "credito", red: "visa" };
export const guardado = (id: string, red: MedioDePago["red"] = "visa"): MedioDePago => ({
  id,
  bancoId: GALICIA,
  nombreBanco: "Banco Galicia",
  tipo: "credito",
  red,
});
export const ok = <T>(datos: T): Resultado<T> => ({ ok: true, datos });

/** Un `DatosPerfil` que contesta lo que se le diga y anota lo que le piden. */
export function remoto(respuestas: Partial<{ [K in keyof DatosPerfil]: Awaited<ReturnType<DatosPerfil[K]>> }> = {}) {
  const llamadas: string[] = [];
  const datos: DatosPerfil = {
    leerBancos: async () => (llamadas.push("leerBancos"), respuestas.leerBancos ?? ok([])),
    leerMisMedios: async () => (llamadas.push("leerMisMedios"), respuestas.leerMisMedios ?? ok([])),
    confirmarOnboarding: async (n) => (
      llamadas.push(`confirmar:${n.length}`), respuestas.confirmarOnboarding ?? ok([guardado("m1")])
    ),
    agregarMedio: async () => (llamadas.push("agregar"), respuestas.agregarMedio ?? ok(guardado("m2", "master"))),
    sacarMedio: async (id) => (llamadas.push(`sacar:${id}`), respuestas.sacarMedio ?? ok(null)),
    leerMisComercios: async () => (llamadas.push("leerMisComercios"), respuestas.leerMisComercios ?? ok([])),
    confirmarComercios: async (n) => (
      llamadas.push(`confirmarComercios:${n.join("|")}`),
      respuestas.confirmarComercios ?? ok(n.map((nombre, i) => ({ id: `c${i + 1}`, nombre })))
    ),
    agregarComercio: async (nombre) => (
      llamadas.push(`agregarComercio:${nombre}`), respuestas.agregarComercio ?? ok({ id: "c9", nombre })
    ),
    sacarComercio: async (id) => (llamadas.push(`sacarComercio:${id}`), respuestas.sacarComercio ?? ok(null)),
    leerNombre: async () => (llamadas.push("leerNombre"), respuestas.leerNombre ?? ok(null)),
    guardarNombre: async (usuarioId, nombre) => (
      llamadas.push(`guardarNombre:${usuarioId}:${nombre}`), respuestas.guardarNombre ?? ok(nombre.trim())
    ),
  };
  return { datos, llamadas };
}

