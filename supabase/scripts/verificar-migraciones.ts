/**
 * Falla si el repo trae migraciones que la base alojada no tiene (issue #127). Lo corre
 * `.github/workflows/migraciones.yml` con la salida de `supabase migration list`:
 *
 *   supabase migration list --db-url "$SUPABASE_DB_URL" > migraciones.txt
 *   node supabase/scripts/verificar-migraciones.ts migraciones.txt
 *
 * Solo lee la salida: no se conecta a nada ni aplica migraciones (ADR-013). Sale con
 * código 1 si hay migraciones sin aplicar o si no pudo leer ninguna (una salida vacía no
 * se toma por «al día»). Las que están solo en la base alojada avisan, sin fallar.
 */
import { readFileSync } from "node:fs";
import { compararMigraciones } from "./migraciones.ts";

const archivo = process.argv[2];
if (!archivo) {
  console.error("Uso: node supabase/scripts/verificar-migraciones.ts <salida-de-migration-list.txt>");
  process.exit(2);
}

const estado = compararMigraciones(readFileSync(archivo, "utf8"));

if (estado.leidas === 0) {
  console.error("::error title=Migraciones::No se pudo leer ninguna migración de la salida de `supabase migration list`.");
  process.exit(1);
}

if (estado.soloRemotas.length > 0) {
  console.warn(
    `::warning title=Migraciones::La base alojada tiene migraciones que el repo no: ${estado.soloRemotas.join(", ")}`,
  );
}

if (estado.sinAplicar.length > 0) {
  console.error(
    `::error title=Migraciones sin aplicar::La base alojada está atrasada. Faltan: ${estado.sinAplicar.join(", ")}. ` +
      "Aplicarlas con `supabase db push --linked` (CLAUDE.md, «Migraciones»).",
  );
  process.exit(1);
}

console.log(`La base alojada está al día: ${estado.leidas} migraciones leídas, ninguna pendiente.`);
