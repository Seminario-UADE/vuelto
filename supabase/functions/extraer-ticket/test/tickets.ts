/**
 * Tres tickets de ejemplo **inventados** (spec 013 T012, FR-017): comercios,
 * CUIT y personas que no existen. Los CUIT tienen dígito verificador válido
 * para que las reglas de privacidad los evalúen como reales. Para cada uno:
 * lo que devolvería Groq (`cruda`) y lo que tiene que devolver el servicio
 * (`esperada`), con hoy = 13/11/2026 en Argentina.
 */
import type { LecturaCruda } from "../extractor.ts";
import type { LecturaTicket } from "../servicio.ts";

export const AHORA = new Date("2026-11-13T15:00:00Z");

export interface TicketDeEjemplo {
  nombre: string;
  cruda: LecturaCruda;
  esperada: LecturaTicket;
}

/** US1-1: un ticket completo, con datos personales que Groq no tapó (US2). */
const almacen: TicketDeEjemplo = {
  nombre: "almacén completo",
  cruda: {
    montoImpreso: "$ 24.500,00",
    comercio: "ALMACÉN DON TOMÁS",
    fechaImpresa: "12/11/2026",
    medio: { bancoImpreso: "BCO DEL PLATA", tipoImpreso: "DEBITO", redImpresa: "VISA", ultimos4Impresos: "1234" },
    texto: [
      "ALMACÉN DON TOMÁS",
      "TOMASITO S.R.L.",
      "CUIT 30-71234567-1",
      "Cliente: [DATO PERSONAL]",
      "Fecha 12/11/2026 Hora 10:15",
      "YERBA 1KG 6.500,00",
      "QUESO 18.000,00",
      "TOTAL 24.500,00",
      "VISA DEBITO 4509 9535 6022 1234",
      "BCO DEL PLATA",
    ].join("\n"),
  },
  esperada: {
    monto: 24500,
    comercio: "ALMACÉN DON TOMÁS",
    fecha: "2026-11-12",
    medio: { banco: "BCO DEL PLATA", tipo: "debito", red: "visa", ultimos4: "1234" },
    textoExtraido: [
      "ALMACÉN DON TOMÁS",
      "TOMASITO S.R.L.",
      "CUIT 30-71234567-1",
      "Cliente: [DATO PERSONAL]",
      "Fecha 12/11/2026 Hora 10:15",
      "YERBA 1KG 6.500,00",
      "QUESO 18.000,00",
      "TOTAL 24.500,00",
      "VISA DEBITO ****1234",
      "BCO DEL PLATA",
    ].join("\n"),
  },
};

/** US1-2: un ticket que no dice con qué se pagó. */
const kiosco: TicketDeEjemplo = {
  nombre: "kiosco sin medio de pago",
  cruda: {
    montoImpreso: "3.250",
    comercio: "KIOSCO LA PARADA",
    fechaImpresa: "02/11/26",
    medio: { bancoImpreso: null, tipoImpreso: null, redImpresa: null, ultimos4Impresos: null },
    texto: "KIOSCO LA PARADA\nCUIT 33-99887766-6\n02/11/26\nALFAJOR x2 3.250\nTOTAL 3.250\nEFECTIVO",
  },
  esperada: {
    monto: 3250,
    comercio: "KIOSCO LA PARADA",
    fecha: "2026-11-02",
    medio: { banco: null, tipo: null, red: null, ultimos4: null },
    textoExtraido: "KIOSCO LA PARADA\nCUIT 33-99887766-6\n02/11/26\nALFAJOR x2 3.250\nTOTAL 3.250\nEFECTIVO",
  },
};

/** US1-3: "TARJETA DE CREDITO" sin red ni dígitos, con DNI y CUIT de una persona en el texto. */
const farmacia: TicketDeEjemplo = {
  nombre: "farmacia con crédito sin red",
  cruda: {
    montoImpreso: "8.420,50",
    comercio: "FARMACIA SAN LUCAS",
    fechaImpresa: "13/11/2026",
    medio: { bancoImpreso: null, tipoImpreso: "TARJETA DE CREDITO", redImpresa: null, ultimos4Impresos: null },
    texto: [
      "FARMACIA SAN LUCAS",
      "Afiliado DNI: 12.345.678",
      "CUIT 20-12345678-6",
      "IBUPROFENO 8.420,50",
      "TOTAL 8.420,50",
      "TARJETA DE CREDITO",
    ].join("\n"),
  },
  esperada: {
    monto: 8420.5,
    comercio: "FARMACIA SAN LUCAS",
    fecha: "2026-11-13",
    medio: { banco: null, tipo: "credito", red: null, ultimos4: null },
    textoExtraido: [
      "FARMACIA SAN LUCAS",
      "Afiliado DNI: [DATO PERSONAL]",
      "CUIT [DATO PERSONAL]",
      "IBUPROFENO 8.420,50",
      "TOTAL 8.420,50",
      "TARJETA DE CREDITO",
    ].join("\n"),
  },
};

export const TICKETS: readonly TicketDeEjemplo[] = [almacen, kiosco, farmacia];
