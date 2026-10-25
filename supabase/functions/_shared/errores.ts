/** El rubro de la compra no está en el catálogo `categorias`. El handler responde 400 `categoriaId`. */
export class CategoriaInexistenteError extends Error {
  constructor() {
    super("La categoría de la compra no existe en el catálogo.");
    this.name = "CategoriaInexistenteError";
  }
}
