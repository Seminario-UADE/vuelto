/**
 * Segunda capa del tapado de datos personales en el texto del ticket (spec 013
 * FR-012, research R5). La primera es el pedido al proveedor (FR-011). Reglas
 * determinísticas por la forma del dato, no por su lugar en el ticket. Los
 * nombres no tienen forma fija: si el proveedor no los tapó, quedan (se mide
 * en la issue #10).
 */

export const MARCA = "[DATO PERSONAL]";
export const LARGO_MAXIMO_TEXTO = 10_000;

/** Cuenta de control de las tarjetas: separa un número de tarjeta de un código de barras. */
function cumpleLuhn(digitos: string): boolean {
  let suma = 0;
  for (let i = 0; i < digitos.length; i++) {
    let d = Number(digitos[digitos.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    suma += d;
  }
  return suma % 10 === 0;
}

/** Dígito verificador de un CUIT o CUIL de 11 dígitos (pesos 5 4 3 2 7 6 5 4 3 2, módulo 11). */
export function cuitValido(digitos: string): boolean {
  if (!/^\d{11}$/.test(digitos)) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((total, peso, i) => total + peso * Number(digitos[i]), 0);
  const resto = 11 - (suma % 11);
  const verificador = resto === 11 ? 0 : resto;
  return verificador !== 10 && verificador === Number(digitos[10]);
}

/** Prefijos de CUIT o CUIL de personas; los de empresas (30, 33, 34) quedan visibles. */
const PREFIJOS_PERSONA = new Set(["20", "23", "24", "27"]);

/**
 * Tarjetas agrupadas como se imprimen (de a 4, o el 4-6-5 de American
 * Express): se tapan siempre, aunque el proveedor haya leído mal un dígito.
 * Ningún número de factura o de producto tiene esa forma.
 */
const TARJETA_AGRUPADA = /\b(?:\d{4}([ -])\d{4}\1\d{4}\1\d{1,7}|\d{4}([ -])\d{6}\2\d{5})\b/g;

/**
 * 13 a 19 dígitos juntos: se tapan solo si cumplen la cuenta de control de las
 * tarjetas, porque así se imprimen también los códigos de barras.
 */
const TARJETA_JUNTA = /\b\d{13,19}\b/g;

/** Tarjetas ya enmascaradas (`****`, `XXXX`), con separadores o sin: quedan `****` y los últimos 4. */
const TARJETA_ENMASCARADA = /(?:[*Xx][ -]?){4,}(\d{4})\b/g;

const CUIT = /\b(\d{2})-?(\d{8})-?(\d)\b/g;

/** DNI anunciado: la palabra se conserva y el número pasa a la marca. */
const DNI = /\b(Documento|D\.N\.I\.|DNI|DOC)(\s*[:.#°º]?\s*(?:N[°ºro.]*\s*)?)(\d{1,2}\.?\d{3}\.?\d{3})\b/gi;

export function taparDatosPersonales(texto: string): string {
  return texto
    .replace(TARJETA_AGRUPADA, (numero) => `****${numero.replace(/\D/g, "").slice(-4)}`)
    .replace(TARJETA_JUNTA, (numero) => (cumpleLuhn(numero) ? `****${numero.slice(-4)}` : numero))
    .replace(TARJETA_ENMASCARADA, (_, ultimos4: string) => `****${ultimos4}`)
    .replace(CUIT, (cuit, prefijo: string, medio: string, verificador: string) =>
      PREFIJOS_PERSONA.has(prefijo) && cuitValido(`${prefijo}${medio}${verificador}`) ? MARCA : cuit,
    )
    .replace(DNI, (_, palabra: string, separador: string) => `${palabra}${separador}${MARCA}`);
}

/** Se aplica después de tapar: así una tarjeta en el borde no queda partida y sin tapar (FR-012). */
export function recortar(texto: string): string {
  return texto.length > LARGO_MAXIMO_TEXTO ? `${texto.slice(0, LARGO_MAXIMO_TEXTO)}[…]` : texto;
}
