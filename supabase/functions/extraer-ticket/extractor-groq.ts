/**
 * Lee la foto del ticket con Groq (ADR-012, spec 013 research R1). Un pedido
 * HTTP con `fetch`, sin SDK. La key, el modo, `fetch` y el límite de tiempo
 * entran por constructor (ADR-009): los tests no usan red ni key.
 */
import { ESQUEMA_LECTURA, validarLecturaCruda } from "./esquema.ts";
import {
  ExtractorNoDisponibleError,
  ExtractorRechazoError,
  ExtractorTiempoAgotadoError,
  RespuestaFueraDeEsquemaError,
  type Extractor,
  type LecturaCruda,
  type TipoImagen,
} from "./extractor.ts";

export const URL_GROQ = "https://api.groq.com/openai/v1/chat/completions";
export const MODELO_GROQ = "qwen/qwen3.8-27b";

/** `estricto`: esquema garantizado por Groq. `json-libre`: respaldo si el estricto no anda con imágenes (FR-019). */
export type ModoGroq = "estricto" | "json-libre";

/** Groq rechaza por límite de uso o está caído: se puede reintentar más tarde. */
const ESTADOS_NO_DISPONIBLE = new Set([429, 500, 502, 503]);

const INSTRUCCIONES = [
  "Sos un lector de tickets de compra de Argentina.",
  "Devolvé cada dato copiado tal como está impreso, sin convertirlo ni corregirlo.",
  "Si un dato no aparece en el ticket, devolvé null. Nunca lo deduzcas de otro dato: por ejemplo, no deduzcas la red por los dígitos de la tarjeta ni el año si no está impreso.",
  "El monto es el total que pagó el cliente.",
  "El comercio es el nombre del local o la marca (suele estar en la primera línea), no la razón social (S.A., S.R.L.). Si no hay nombre de local, la razón social.",
  "En el campo texto, transcribí el ticket completo, renglón por renglón, reemplazando nombres de personas, DNI y números de tarjeta (salvo los últimos 4 dígitos) por [DATO PERSONAL].",
].join("\n");

export interface OpcionesGroq {
  key: string;
  modo: ModoGroq;
  fetch: typeof fetch;
  /** Corte del pedido a Groq (FR-015: 20 s). */
  limiteMs: number;
}

/** Base64 en trozos: `String.fromCharCode(...bytes)` con una imagen entera desborda la pila. */
function aBase64(bytes: Uint8Array): string {
  let binario = "";
  const TROZO = 0x8000;
  for (let i = 0; i < bytes.length; i += TROZO) {
    binario += String.fromCharCode(...bytes.subarray(i, i + TROZO));
  }
  return btoa(binario);
}

export class ExtractorGroq implements Extractor {
  constructor(private readonly opciones: OpcionesGroq) {}

  async leer(imagen: Uint8Array, tipo: TipoImagen): Promise<LecturaCruda> {
    const respuesta = await this.pedir(this.cuerpo(imagen, tipo));
    if (!respuesta.ok) {
      if (ESTADOS_NO_DISPONIBLE.has(respuesta.status)) throw new ExtractorNoDisponibleError(respuesta.status);
      throw new ExtractorRechazoError(respuesta.status);
    }
    return this.lecturaDe(await respuesta.json().catch(() => null));
  }

  private cuerpo(imagen: Uint8Array, tipo: TipoImagen): string {
    const estricto = this.opciones.modo === "estricto";
    const instrucciones = estricto
      ? INSTRUCCIONES
      : `${INSTRUCCIONES}\nRespondé solo con un JSON que cumpla este esquema:\n${JSON.stringify(ESQUEMA_LECTURA)}`;
    return JSON.stringify({
      model: MODELO_GROQ,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: instrucciones },
            { type: "image_url", image_url: { url: `data:${tipo};base64,${aBase64(imagen)}` } },
          ],
        },
      ],
      response_format: estricto
        ? { type: "json_schema", json_schema: { name: "lectura_ticket", strict: true, schema: ESQUEMA_LECTURA } }
        : { type: "json_object" },
    });
  }

  /** Corta a los `limiteMs` (FR-015). Sin conexión es "no disponible", no un error nuestro. */
  private async pedir(cuerpo: string): Promise<Response> {
    const control = new AbortController();
    const corte = setTimeout(() => control.abort(), this.opciones.limiteMs);
    try {
      return await this.opciones.fetch(URL_GROQ, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.opciones.key}`, "Content-Type": "application/json" },
        body: cuerpo,
        signal: control.signal,
      });
    } catch (error) {
      if (control.signal.aborted) throw new ExtractorTiempoAgotadoError();
      throw new ExtractorNoDisponibleError(null, error instanceof Error ? `${error.name}: ${error.message}` : null);
    } finally {
      clearTimeout(corte);
    }
  }

  private lecturaDe(cuerpo: unknown): LecturaCruda {
    const contenido = (cuerpo as { choices?: { message?: { content?: unknown } }[] } | null)?.choices?.[0]?.message
      ?.content;
    if (typeof contenido !== "string") throw new RespuestaFueraDeEsquemaError("", "json");
    let datos: unknown;
    try {
      datos = JSON.parse(contenido);
    } catch {
      throw new RespuestaFueraDeEsquemaError("", "json");
    }
    const resultado = validarLecturaCruda(datos);
    if (!resultado.ok) throw new RespuestaFueraDeEsquemaError(resultado.camino, resultado.regla);
    return resultado.lectura;
  }
}
