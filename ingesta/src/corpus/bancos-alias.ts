/**
 * Alias de bancos: nombres que trae el listado de MODO (`name_bank`) y que no
 * coinciden con el `name` del catálogo (`GET /promos/api/rewards/banks`) más
 * que por el formato. Clave = nombre del listado; valor = nombre del catálogo.
 * Ambos se comparan normalizados (minúsculas, sin acentos, sin espacios de más).
 *
 * Relevado el 2026-11-02 sobre las promos vigentes de Supermercados y
 * Farmacias contra el catálogo de 82 bancos. Cada alias es una decisión
 * revisada por una persona: la comparación nunca es por coincidencia parcial.
 *
 * Lo que NO está acá a propósito, porque no es un alias:
 *  - «Bancos adheridos»: no es un banco.
 *  - «Ciudad / Buepp»: son dos bancos del catálogo (ambiguo).
 *  - «Macro Selecta» (y sus niveles): es un nivel de cliente de Macro; el perfil
 *    del usuario no distingue niveles, así que esas promos se excluyen.
 */
export const ALIAS_BANCOS: Readonly<Record<string, string>> = {
  "Banco Macro": "Macro",
  "Banco Hipotecario": "Hipotecario",
  "Banco Comafi": "Comafi",
  "Banco Credicoop": "Credicoop",
  BNA: "Banco Nación",
  Columbia: "Banco Columbia",
};
