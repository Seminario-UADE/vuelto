/** El rubro de la compra no está en el catálogo `categorias`. El handler responde 400 `categoriaId`. */
export class CategoriaInexistenteError extends Error {
  constructor() {
    super("La categoría de la compra no existe en el catálogo.");
    this.name = "CategoriaInexistenteError";
  }
}

/**
 * Algún id del grupo no es contacto vinculado de quien pide, o no existe (spec 013, FR-023). El
 * handler responde 409 `contacto_no_vinculado`, igual en los dos casos.
 */
export class ContactoNoVinculadoError extends Error {
  constructor() {
    super("Alguien del grupo no es contacto vinculado.");
    this.name = "ContactoNoVinculadoError";
  }
}

