/**
 * Mide el corpus real (issue #42, FR-020). NO es una prueba: imprime el informe. Usa la anon key y la
 * sesión de un usuario de prueba, nunca la service role (constitución §IV).
 *
 *   EXPO_PUBLIC_SUPABASE_URL=… EXPO_PUBLIC_SUPABASE_ANON_KEY=… MEDICION_EMAIL=… MEDICION_PASSWORD=… \
 *     npm run medir:corpus -w @vuelto/mobile
 */
import { createClient } from "@supabase/supabase-js";
import { fechaArgentina } from "@vuelto/motor";
import { describe, expect, it } from "vitest";
import type { Cursor, FilaPromocion } from "./contratos";
import { filaAPromocion } from "./mapeo";
import { informe, medirCorpus } from "./medicion";
import { leerTodo } from "./paginar";
import { repositorioSupabase } from "./repositorio-supabase";
import { ventanaDeCompras } from "./ventana";

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = process.env.MEDICION_EMAIL;
const CLAVE = process.env.MEDICION_PASSWORD;

describe.skipIf(!(URL && ANON && EMAIL && CLAVE))("medición del corpus", () => {
  it("baja el corpus del período con la misma lectura que usa la app y lo mide", async () => {
    const cliente = createClient(URL!, ANON!, { auth: { persistSession: false } });
    const { error } = await cliente.auth.signInWithPassword({ email: EMAIL!, password: CLAVE! });
    if (error) throw error;

    const repo = repositorioSupabase(cliente);
    const { desde } = ventanaDeCompras(new Date());
    const filas = await leerTodo<FilaPromocion>(
      (cursor: Cursor) =>
        repo.promociones({ desde: null, vigenteDesde: desde, cursor, limite: 500, signal: new AbortController().signal }),
      (f) => ({ valor: f.actualizada_en, id: f.id }),
    );
    const promociones = filas.flatMap((f) => {
      const p = filaAPromocion(f);
      return p === null ? [] : [p];
    });

    const m = medirCorpus(promociones);
    // `process.stdout` y no `console.log`: vitest intercepta la consola y el informe es la salida.
    process.stdout.write(
      `\n${informe(m, `MEDICIÓN del corpus de ${fechaArgentina(new Date())} (vigentes desde ${desde})`)}\n` +
        `  filas descartadas por inválidas: ${filas.length - promociones.length}\n\n`,
    );
    expect(m.cantidad).toBe(promociones.length);
  });
});
