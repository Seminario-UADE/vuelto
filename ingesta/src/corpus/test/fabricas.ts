/** Datos de prueba compartidos por los tests de la ingesta. No es código de producción. */
import { readFileSync } from "node:fs";
import type { BancoCatalogo, PromocionIngestada } from "../tipos.ts";

export const BANCO_ICBC = "bcfcac03-6f79-4995-bfab-7b8916b0747a";
export const BANCO_GALICIA = "88d8705e-2dda-46f9-8411-bb4916af858e";
export const CATALOGO_PRUEBA: ReadonlySet<string> = new Set([BANCO_ICBC, BANCO_GALICIA]);

/** Una promo válida: los tests la rompen de a una regla por vez. */
export function promocion(datos: Partial<PromocionIngestada> = {}): PromocionIngestada {
  return {
    fuenteId: "20-paladini-icbc-ago26",
    fuente: "modo",
    titulo: "20% en Paladini",
    bancoId: BANCO_ICBC,
    categoriaId: 1,
    comercio: "Paladini",
    porcentaje: 20,
    tarjetas: { debito: ["visa"], credito: ["visa", "master"] },
    vigencia: { desde: "2026-08-07", hasta: "2027-01-30", dias: ["vie"] },
    tope: { monto: 10000, periodo: "mensual", alcance: null, grupoTopeId: null },
    montoMinimo: null,
    jurisdiccion: null,
    canal: "presencial",
    acumulable: null,
    fragmentosFuente: {},
    ...datos,
  };
}

/** El catálogo real de 82 bancos de MODO (`docs/product/data/modo-bancos-raw.json`). */
export function catalogoReal(): BancoCatalogo[] {
  const archivo = JSON.parse(
    readFileSync(new URL("../../../../docs/product/data/modo-bancos-raw.json", import.meta.url), "utf8"),
  ) as { bancos: BancoCatalogo[] };
  return archivo.bancos.map((b) => ({ id: b.id, name: b.name }));
}
