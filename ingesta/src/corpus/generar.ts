/**
 * Generador de los derivados del corpus (research D1).
 *
 *   npm run corpus:generar -w ingesta               # valida y escribe
 *   npm run corpus:generar -w ingesta -- --verificar # no escribe: falla si algo se desfasó
 *
 * La fuente de verdad es `supabase/seed/promociones.json`. De ahí salen:
 *  - `supabase/seed/bancos.sql` y `supabase/seed/promociones.sql`: los carga
 *    `supabase db reset`, así Postgres valida cada fila contra los `check` y
 *    las claves foráneas reales;
 *  - `packages/motor/src/test/corpus.ts`: las fixtures tipadas del motor;
 *  - `supabase/seed/promociones.json` mismo, en formato canónico.
 * Si el archivo es inválido no escribe nada.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ejecutarComoScript, parsearArgumentos, raizDelRepo } from "./args.ts";
import { COLUMNAS_PROMOCION, aFila, sqlTexto, valoresSql } from "./filas.ts";
import { idDePromocion } from "./ids.ts";
import { leerInsumos } from "./insumos.ts";
import { FUENTE_CORPUS } from "./tipos.ts";
import type { ArchivoCorpus, EntradaCorpus, Insumos } from "./tipos.ts";
import { validarArchivo, validarExclusiones, validarGruposTope } from "./validar.ts";
import type { Hallazgo } from "./validar.ts";

/** El «ahora» fijo de los tests del motor con fixtures reales (research D14). */
export const AHORA_CORPUS_ISO = "2026-11-04T15:00:00Z";

const RUTA_JSON = "supabase/seed/promociones.json";
const RUTA_BANCOS_SQL = "supabase/seed/bancos.sql";
const RUTA_PROMOCIONES_SQL = "supabase/seed/promociones.sql";
const RUTA_FIXTURES = "packages/motor/src/test/corpus.ts";

const COMANDO = "npm run corpus:generar -w ingesta";

// ---------- SQL ----------

function porCategoriaYFuenteId(a: EntradaCorpus, b: EntradaCorpus): number {
  return a.categoriaId - b.categoriaId || (a.fuenteId < b.fuenteId ? -1 : a.fuenteId > b.fuenteId ? 1 : 0);
}

const CABECERA = (que: string, origen: string) =>
  `-- GENERADO por \`${COMANDO}\` desde ${origen}. No editar a mano.\n-- ${que}\n`;

export function generarBancosSql(bancos: readonly { id: string; name: string }[]): string {
  const cabecera = CABECERA(
    "Catálogo de bancos de MODO, con su id real. Idempotente (`supabase db reset` y carga remota).",
    "docs/product/data/modo-bancos-raw.json",
  );
  if (bancos.length === 0) return cabecera;
  const filas = [...bancos]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((b) => `  (${sqlTexto(b.id)}, ${sqlTexto(b.name)})`);
  return `${cabecera}\ninsert into public.bancos (id, nombre) values\n${filas.join(",\n")}\non conflict (id) do update set nombre = excluded.nombre;\n`;
}

export function generarPromocionesSql(entradas: readonly EntradaCorpus[]): string {
  const cabecera = CABECERA(
    "Corpus de promociones sembrado a mano (fuente = 'manual'). Idempotente por (fuente, fuente_id).",
    RUTA_JSON,
  );
  if (entradas.length === 0) return cabecera;
  // La baja no se escribe al insertar (queda en su valor por defecto); al reescribir una promo se limpia.
  const columnas = COLUMNAS_PROMOCION.filter((c) => c !== "dada_de_baja_en");
  const filas = [...entradas].sort(porCategoriaYFuenteId).map((e) => {
    const valores = valoresSql(aFila(e));
    return `  (${columnas.map((c) => valores[c]).join(", ")})`;
  });
  const actualizar = [...columnas.slice(3).map((c) => `${c} = excluded.${c}`), "dada_de_baja_en = null"];
  return (
    `${cabecera}\ninsert into public.promociones (${columnas.join(", ")}) values\n${filas.join(",\n")}\n` +
    `on conflict (fuente, fuente_id) do update set\n  ${actualizar.join(",\n  ")};\n`
  );
}

// ---------- Fixtures del motor ----------

function comoPromocion(e: EntradaCorpus) {
  return {
    id: idDePromocion(FUENTE_CORPUS, e.fuenteId),
    fuente: e.fuente,
    titulo: e.titulo,
    bancoId: e.bancoId,
    categoriaId: e.categoriaId,
    comercio: e.comercio,
    porcentaje: e.porcentaje,
    tarjetas: { debito: e.tarjetas.debito, credito: e.tarjetas.credito },
    vigencia: { desde: e.vigencia.desde, hasta: e.vigencia.hasta, dias: e.vigencia.dias },
    tope: { monto: e.tope.monto, periodo: e.tope.periodo, alcance: e.tope.alcance, grupoTopeId: e.tope.grupoTopeId },
    montoMinimo: e.montoMinimo,
    jurisdiccion: e.jurisdiccion,
    canal: e.canal,
    acumulable: e.acumulable,
  };
}

export function generarFixtures(entradas: readonly EntradaCorpus[]): string {
  const elegidas = entradas.filter((e) => e.fixture).sort(porCategoriaYFuenteId);
  const cuerpo = elegidas
    .map((e) => {
      const json = JSON.stringify(comoPromocion(e), null, 2).split("\n").map((l) => `  ${l}`).join("\n");
      return `  // ${e.fuenteId}\n${json},`;
    })
    .join("\n");
  return (
    `/**\n * GENERADO por \`${COMANDO}\` desde ${RUTA_JSON}. No editar a mano.\n` +
    ` * Promos reales del corpus (las marcadas con \`fixture: true\`) para los tests del motor.\n` +
    ` * Foto fechada: no depende de \`ingesta/\` ni de \`supabase/\`. No se compila a \`dist/\`.\n */\n` +
    `import type { Promocion } from "../tipos.ts";\n\n` +
    `/** El «ahora» fijo de los tests con fixtures reales: las promos vencen, los tests no. */\n` +
    `export const AHORA_CORPUS = new Date("${AHORA_CORPUS_ISO}");\n\n` +
    `export const PROMOS_CORPUS: Promocion[] = [${elegidas.length === 0 ? "" : `\n${cuerpo}\n`}];\n`
  );
}

// ---------- Formato canónico del JSON ----------

function ordenarEntrada(e: EntradaCorpus): EntradaCorpus {
  const fragmentos: Record<string, string | null> = {};
  for (const clave of Object.keys(e.fragmentosFuente).sort()) fragmentos[clave] = e.fragmentosFuente[clave] ?? null;
  return {
    fuenteId: e.fuenteId,
    fuente: e.fuente,
    titulo: e.titulo,
    bancoId: e.bancoId,
    categoriaId: e.categoriaId,
    comercio: e.comercio,
    porcentaje: e.porcentaje,
    tarjetas: { debito: e.tarjetas.debito, credito: e.tarjetas.credito },
    vigencia: { desde: e.vigencia.desde, hasta: e.vigencia.hasta, dias: e.vigencia.dias },
    tope: { monto: e.tope.monto, periodo: e.tope.periodo, alcance: e.tope.alcance, grupoTopeId: e.tope.grupoTopeId },
    montoMinimo: e.montoMinimo,
    jurisdiccion: e.jurisdiccion,
    canal: e.canal,
    acumulable: e.acumulable,
    fragmentosFuente: fragmentos,
    fixture: e.fixture,
    revision: { verificadaEl: e.revision.verificadaEl, revisor: e.revision.revisor, notas: e.revision.notas },
  };
}

export function formatoCanonico(archivo: ArchivoCorpus): string {
  const ordenado: ArchivoCorpus = {
    version: 1,
    promociones: [...archivo.promociones].sort(porCategoriaYFuenteId).map(ordenarEntrada),
  };
  return `${JSON.stringify(ordenado, null, 2)}\n`;
}

// ---------- Orquestación ----------

export function calcularSalidas(insumos: Insumos): Record<string, string> {
  const { promociones } = insumos.archivo;
  return {
    [RUTA_JSON]: formatoCanonico(insumos.archivo),
    [RUTA_BANCOS_SQL]: generarBancosSql(insumos.bancos),
    [RUTA_PROMOCIONES_SQL]: generarPromocionesSql(promociones),
    [RUTA_FIXTURES]: generarFixtures(promociones),
  };
}

export interface OpcionesGeneracion {
  /** Lee un archivo por ruta relativa a la raíz del repo; `null` si no existe. */
  leer: (ruta: string) => string | null;
  escribir: (ruta: string, contenido: string) => void;
  verificar: boolean;
}

export interface ResultadoGeneracion {
  ok: boolean;
  errores: Hallazgo[];
  avisos: Hallazgo[];
  desfasados: string[];
  escritos: string[];
  mensaje: string;
}

/** Valida el corpus completo: el archivo, las exclusiones y el registro de grupos de tope. */
export function validarInsumos(insumos: Insumos): { errores: Hallazgo[]; avisos: Hallazgo[] } {
  const validacion = validarArchivo(insumos.archivo, {
    catalogoBancos: insumos.bancos.map((b) => b.id),
    gruposTope: insumos.gruposTope,
    exclusiones: insumos.exclusiones,
  });
  return {
    errores: [
      ...validacion.errores,
      ...validarExclusiones(insumos.exclusiones).errores,
      ...validarGruposTope(insumos.gruposTope).errores,
    ],
    avisos: validacion.avisos,
  };
}

export function ejecutarGeneracion(insumos: Insumos, opciones: OpcionesGeneracion): ResultadoGeneracion {
  const { errores, avisos } = validarInsumos(insumos);
  if (errores.length > 0) {
    return {
      ok: false,
      errores,
      avisos,
      desfasados: [],
      escritos: [],
      mensaje: `Hay ${errores.length} error(es) en el corpus: no se escribió nada.`,
    };
  }

  const salidas = calcularSalidas(insumos);
  if (opciones.verificar) {
    const desfasados = Object.keys(salidas)
      .filter((ruta) => opciones.leer(ruta) !== salidas[ruta])
      .sort();
    return {
      ok: desfasados.length === 0,
      errores,
      avisos,
      desfasados,
      escritos: [],
      mensaje:
        desfasados.length === 0
          ? "Los derivados coinciden con promociones.json."
          : `Se desfasaron: ${desfasados.join(", ")}. Corré \`${COMANDO}\` y commiteá el resultado.`,
    };
  }
  for (const [ruta, contenido] of Object.entries(salidas)) opciones.escribir(ruta, contenido);
  return {
    ok: true,
    errores,
    avisos,
    desfasados: [],
    escritos: Object.keys(salidas).sort(),
    mensaje: `Se escribieron ${Object.keys(salidas).length} archivos.`,
  };
}

// ---------- Línea de comandos ----------

/* v8 ignore start */
function main(argv: readonly string[]): void {
  const { banderas } = parsearArgumentos(argv, ["verificar"]);
  const raiz = raizDelRepo();
  const insumos = leerInsumos((ruta) => readFileSync(resolve(raiz, ruta), "utf8"));
  const resultado = ejecutarGeneracion(insumos, {
    verificar: banderas.includes("verificar"),
    leer: (ruta) => {
      try {
        return readFileSync(resolve(raiz, ruta), "utf8");
      } catch {
        return null;
      }
    },
    escribir: (ruta, contenido) => {
      const destino = resolve(raiz, ruta);
      mkdirSync(dirname(destino), { recursive: true });
      writeFileSync(destino, contenido);
    },
  });
  for (const a of resultado.avisos) console.warn(`aviso [${a.regla}] ${a.mensaje}`);
  for (const e of resultado.errores) console.error(`error [${e.regla}] ${e.fuenteId ?? "-"}: ${e.mensaje}`);
  console.log(resultado.mensaje);
  if (!resultado.ok) process.exitCode = 1;
}

ejecutarComoScript(import.meta.url, () => main(process.argv.slice(2)));
/* v8 ignore stop */
