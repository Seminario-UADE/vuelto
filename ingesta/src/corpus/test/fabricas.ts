/** Datos de prueba compartidos por los tests del corpus. No es código de producción. */
import { readFileSync } from "node:fs";
import type { BancoCatalogo, EntradaCorpus, Exclusion, GruposTope } from "../tipos.ts";

export const BANCO_ICBC = "bcfcac03-6f79-4995-bfab-7b8916b0747a";
export const BANCO_GALICIA = "88d8705e-2dda-46f9-8411-bb4916af858e";
export const CATALOGO_PRUEBA: readonly string[] = [BANCO_ICBC, BANCO_GALICIA];

/** Una entrada válida: los tests la rompen de a una regla por vez. */
export function entrada(datos: Partial<EntradaCorpus> = {}): EntradaCorpus {
  return {
    fuenteId: "20-paladini-icbc-ago26",
    fuente: "manual",
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
    fixture: false,
    revision: { verificadaEl: "2026-11-02", revisor: "spazos32", notas: [] },
    ...datos,
  };
}

export const GRUPOS_PRUEBA: GruposTope = {
  "icbc:modo-mensual": {
    banco: "icbc",
    clave: "modo-mensual",
    fragmento: "TOPE DE REINTEGRO $10.000 POR USUARIO POR MES",
    creadoPor: "spazos32",
  },
};

export const SIN_EXCLUSIONES: readonly Exclusion[] = [];

export function contexto(
  datos: { gruposTope?: GruposTope; exclusiones?: readonly Exclusion[] } = {},
) {
  return {
    catalogoBancos: CATALOGO_PRUEBA,
    gruposTope: datos.gruposTope ?? GRUPOS_PRUEBA,
    exclusiones: datos.exclusiones ?? SIN_EXCLUSIONES,
  };
}

/** El catálogo real de 82 bancos de MODO (`docs/product/data/modo-bancos-raw.json`). */
export function catalogoReal(): BancoCatalogo[] {
  const archivo = JSON.parse(
    readFileSync(new URL("../../../../docs/product/data/modo-bancos-raw.json", import.meta.url), "utf8"),
  ) as { bancos: BancoCatalogo[] };
  return archivo.bancos.map((b) => ({ id: b.id, name: b.name }));
}
