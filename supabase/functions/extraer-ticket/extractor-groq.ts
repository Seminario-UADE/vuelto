/**
 * Lee la foto del ticket con Groq (ADR-012, spec 013 research R1). Un pedido
 * HTTP con `fetch`, sin SDK. La key, el modo, `fetch`, el límite de tiempo y
 * el reloj entran por constructor (ADR-009): los tests no usan red ni key.
 *
 * Sin tope de respuesta: con `max_completion_tokens` Groq cortaba la
 * transcripción mucho antes del tope (prueba manual, 13/11). La respuesta la
 * acotan el corte de 20 s y el límite de salida por minuto de Groq.
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

/**
 * Ante un 429, se reintenta una sola vez si Groq pide esperar hasta 12 s y la
 * espera más una lectura entran en el límite de tiempo (FR-015). En la prueba
 * manual, Groq pidió entre 8 y 10 s.
 */
export const ESPERA_MAXIMA_REINTENTO_S = 12;

/** Lo mínimo que tiene que quedar para la segunda lectura (en la prueba tardó unos 2 s). */
const TIEMPO_MINIMO_LECTURA_MS = 5_000;

/**
 * Lo que informa Groq de la última lectura: tokens gastados y por qué terminó
 * (`length` = se cortó). Sin datos del ticket: sirve para diagnosticar el
 * cupo y para los registros.
 */
export interface UsoGroq {
  tokensEntrada: number | null;
  tokensSalida: number | null;
  motivoFin: string | null;
}

/** Groq rechaza por límite de uso o está caído: se puede reintentar más tarde. */
const ESTADOS_NO_DISPONIBLE = new Set([429, 500, 502, 503]);

const INSTRUCCIONES = [
  "Sos un lector de tickets de compra de Argentina.",
  "Devolvé cada dato copiado tal como está impreso, sin convertirlo ni corregirlo.",
  "Si un dato no aparece en el ticket, devolvé null. Nunca lo deduzcas de otro dato: por ejemplo, no deduzcas la red por los dígitos de la tarjeta ni el año si no está impreso.",
  "El monto es el total que pagó el cliente.",
  "El comercio es el nombre del local o la marca (suele estar en la primera línea), no la razón social (S.A., S.R.L.). Si no hay nombre de local, la razón social.",
  "En el campo texto, transcribí el ticket completo, renglón por renglón, reemplazando nombres de personas (también del mozo, cajero o vendedor), DNI y números de tarjeta (salvo los últimos 4 dígitos) por [DATO PERSONAL].",
].join("\n");

export interface OpcionesGroq {
  key: string;
  modo: ModoGroq;
  fetch: typeof fetch;
  /** Tiempo máximo de la lectura, incluido un reintento (FR-015: 20 s). */
  limiteMs: number;
  /** Espera antes del reintento. */
  esperar: (ms: number) => Promise<void>;
  /** Reloj en milisegundos, para saber cuánto tiempo queda. */
  ahora: () => number;
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

/**
 * Lo que dice Groq sobre el rechazo: qué límite se superó y cuánto esperar.
 * El id de la organización se tapa: no hace falta para diagnosticar.
 */
async function noDisponible(respuesta: Response): Promise<ExtractorNoDisponibleError> {
  const cuerpo = (await respuesta.json().catch(() => null)) as { error?: { message?: unknown } } | null;
  const mensaje = typeof cuerpo?.error?.message === "string" ? cuerpo.error.message : null;
  const espera = Number(respuesta.headers.get("retry-after"));
  return new ExtractorNoDisponibleError(
    respuesta.status,
    mensaje?.replace(/org_[A-Za-z0-9]+/g, "org_…") ?? null,
    Number.isFinite(espera) && espera >= 0 && respuesta.headers.has("retry-after") ? espera : null,
  );
}

export class ExtractorGroq implements Extractor {
  /** Uso de la última respuesta de Groq; `null` antes de la primera o si no respondió. */
  ultimoUso: UsoGroq | null = null;

  constructor(private readonly opciones: OpcionesGroq) {}

  async leer(imagen: Uint8Array, tipo: TipoImagen): Promise<LecturaCruda> {
    this.ultimoUso = null;
    const cuerpo = this.cuerpo(imagen, tipo);
    const inicio = this.opciones.ahora();
    try {
      return await this.intentar(cuerpo, this.opciones.limiteMs);
    } catch (error) {
      if (!(error instanceof ExtractorNoDisponibleError)) throw error;
      const espera = this.esperaParaReintentar(error, inicio);
      if (espera === null) throw error;
      await this.opciones.esperar(espera);
      return await this.intentar(cuerpo, this.opciones.limiteMs - (this.opciones.ahora() - inicio));
    }
  }

  /** Milisegundos a esperar antes del único reintento, o `null` si no conviene reintentar. */
  private esperaParaReintentar(error: ExtractorNoDisponibleError, inicio: number): number | null {
    if (error.estado !== 429 || error.reintentarEn === null) return null;
    if (error.reintentarEn > ESPERA_MAXIMA_REINTENTO_S) return null;
    const espera = error.reintentarEn * 1000;
    const transcurrido = this.opciones.ahora() - inicio;
    return transcurrido + espera + TIEMPO_MINIMO_LECTURA_MS <= this.opciones.limiteMs ? espera : null;
  }

  private async intentar(cuerpo: string, limiteMs: number): Promise<LecturaCruda> {
    const respuesta = await this.pedir(cuerpo, limiteMs);
    if (!respuesta.ok) {
      if (ESTADOS_NO_DISPONIBLE.has(respuesta.status)) throw await noDisponible(respuesta);
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
      // Sin "pensamiento" interno: no hace falta para copiar un ticket, gasta
      // cupo y puede cortar la respuesta antes de tiempo (prueba manual, 13/11).
      reasoning_effort: "none",
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
  private async pedir(cuerpo: string, limiteMs: number): Promise<Response> {
    const control = new AbortController();
    const corte = setTimeout(() => control.abort(), limiteMs);
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
    const datosGroq = cuerpo as {
      choices?: { message?: { content?: unknown }; finish_reason?: unknown }[];
      usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
    } | null;
    const numero = (v: unknown) => (typeof v === "number" ? v : null);
    const motivo = datosGroq?.choices?.[0]?.finish_reason;
    this.ultimoUso = {
      tokensEntrada: numero(datosGroq?.usage?.prompt_tokens),
      tokensSalida: numero(datosGroq?.usage?.completion_tokens),
      motivoFin: typeof motivo === "string" ? motivo : null,
    };
    const contenido = datosGroq?.choices?.[0]?.message?.content;
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
