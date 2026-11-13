/**
 * Prueba manual con fotos reales (spec 013 FR-019, quickstart §1). La corre el
 * usuario en una terminal aparte, fuera de la sesión de IA:
 *
 *   read -rs GROQ_API_KEY && export GROQ_API_KEY
 *   npx deno run --no-lock --config supabase/functions/extraer-ticket/deno.json \
 *     --allow-net=api.groq.com --allow-read --allow-env=GROQ_API_KEY \
 *     supabase/functions/extraer-ticket/prueba-manual.ts [--modo=json-libre] foto1.jpg foto2.jpg foto3.jpg
 *
 * Escribe por pantalla lo que leyó Groq de cada foto, o el error. Nunca
 * escribe la key ni la imagen. No la chequea `tsc` en Node (usa `Deno`): la
 * chequea `deno check`.
 */
import { ExtractorGroq, type ModoGroq } from "./extractor-groq.ts";
import {
  ExtractorNoDisponibleError,
  ExtractorRechazoError,
  RespuestaFueraDeEsquemaError,
  type TipoImagen,
} from "./extractor.ts";

const TIPOS: Record<string, TipoImagen> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const key = Deno.env.get("GROQ_API_KEY");
if (!key) {
  console.error("Falta GROQ_API_KEY en el entorno (ver quickstart §1).");
  Deno.exit(1);
}

const modo: ModoGroq = Deno.args.includes("--modo=json-libre") ? "json-libre" : "estricto";
const fotos = Deno.args.filter((a) => !a.startsWith("--"));
if (fotos.length === 0) {
  console.error("Pasá al menos una foto: prueba-manual.ts foto1.jpg foto2.jpg foto3.jpg");
  Deno.exit(1);
}

const extractor = new ExtractorGroq({
  key,
  modo,
  fetch,
  limiteMs: 20_000,
  esperar: (ms) => new Promise((r) => setTimeout(r, ms)),
  ahora: () => Date.now(),
});
const resultados: Record<string, unknown> = {};

for (const ruta of fotos) {
  // Solo el nombre del archivo: la ruta completa puede decir algo de la persona.
  const nombre = ruta.split(/[\\/]/).pop() ?? ruta;
  const tipo = TIPOS[nombre.split(".").pop()?.toLowerCase() ?? ""];
  if (!tipo) {
    resultados[nombre] = { error: "formato_no_soportado" };
    continue;
  }
  const inicio = Date.now();
  try {
    const lectura = await extractor.leer(await Deno.readFile(ruta), tipo);
    // `uso`: tokens gastados y `motivoFin` ("length" = la respuesta se cortó).
    resultados[nombre] = { ms: Date.now() - inicio, uso: extractor.ultimoUso, lectura };
  } catch (error) {
    const ms = Date.now() - inicio;
    // Solo el tipo de falla, el código HTTP o el camino del campo: nunca la key ni datos del ticket.
    if (error instanceof RespuestaFueraDeEsquemaError) {
      resultados[nombre] = { ms, error: error.name, camino: error.camino, regla: error.regla };
    } else if (error instanceof ExtractorNoDisponibleError) {
      resultados[nombre] = {
        ms,
        error: error.name,
        estado: error.estado,
        causa: error.causa,
        reintentarEn: error.reintentarEn,
      };
    } else if (error instanceof ExtractorRechazoError) {
      resultados[nombre] = { ms, error: error.name, estado: error.estado };
    } else {
      resultados[nombre] = { ms, error: error instanceof Error ? `${error.name}: ${error.message}` : "desconocido" };
    }
  }
}

console.log(JSON.stringify({ modo, resultados }, null, 2));
