/**
 * Lo que puede salir mal al leer un ticket y qué se le muestra al usuario (spec 014, FR-011).
 * Funciones puras: se testean en Node.
 */

/** Los resultados que no son éxito; cada uno es una fila de la tabla de FR-011. */
export type ResultadoLectura =
  | "no_autenticado"
  | "foto_no_valida"
  | "imagen_demasiado_grande"
  | "ticket_ilegible"
  | "no_disponible"
  | "tardo_demasiado"
  | "sin_conexion"
  | "interno";

export type SalidaLectura = "probar_de_nuevo" | "iniciar_sesion" | "cargar_a_mano";

export type Salida = { mensaje: string; salidas: SalidaLectura[] };

const REINTENTO: SalidaLectura[] = ["probar_de_nuevo", "cargar_a_mano"];

const SALIDAS: Record<ResultadoLectura, Salida> = {
  no_autenticado: {
    mensaje: "Tu sesión venció. Iniciá sesión para leer el ticket.",
    salidas: ["iniciar_sesion", "cargar_a_mano"],
  },
  foto_no_valida: { mensaje: "No pudimos abrir la foto. Sacala de nuevo.", salidas: REINTENTO },
  imagen_demasiado_grande: { mensaje: "La foto es muy pesada para leerla.", salidas: ["cargar_a_mano"] },
  ticket_ilegible: {
    mensaje: "No pudimos leer el ticket. Probá con más luz o cargá la compra a mano.",
    salidas: REINTENTO,
  },
  no_disponible: {
    mensaje: "El lector no está disponible ahora. Probá en un rato o cargá la compra a mano.",
    salidas: REINTENTO,
  },
  tardo_demasiado: { mensaje: "Tardó demasiado. Probá de nuevo.", salidas: REINTENTO },
  sin_conexion: {
    mensaje: "Sin conexión no podemos leer el ticket. Probá de nuevo cuando tengas internet o cargá la compra a mano.",
    salidas: REINTENTO,
  },
  interno: { mensaje: "Algo falló. Probá de nuevo o cargá la compra a mano.", salidas: REINTENTO },
};

export function salidaDe(resultado: ResultadoLectura): Salida {
  const { mensaje, salidas } = SALIDAS[resultado];
  return { mensaje, salidas: [...salidas] };
}

/** Los códigos de error del contrato de la spec 013, agrupados como los ve el usuario. */
const POR_CODIGO: Record<string, ResultadoLectura> = {
  no_autenticado: "no_autenticado",
  invalido: "foto_no_valida",
  formato_no_soportado: "foto_no_valida",
  imagen_danada: "foto_no_valida",
  imagen_demasiado_grande: "imagen_demasiado_grande",
  ticket_ilegible: "ticket_ilegible",
  no_disponible: "no_disponible",
  tardo_demasiado: "tardo_demasiado",
};

/** Lo que no está en el contrato (incluido `metodo_no_permitido`) es `interno`. */
export function resultadoDeCodigo(codigo: unknown): ResultadoLectura {
  if (typeof codigo !== "string" || !Object.hasOwn(POR_CODIGO, codigo)) return "interno";
  return POR_CODIGO[codigo] as ResultadoLectura;
}
