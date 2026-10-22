/**
 * Las 13 categorías que publicaba MODO al 21/09/2026, con el id numérico de
 * su API (`docs/product/alcance-mvp.md`). Son datos iniciales para el seed y
 * los tests, no un enum: la fuente de verdad es la tabla `categorias` de
 * Supabase, así una categoría nueva de MODO no requiere cambiar el motor.
 *
 * Se filtra siempre por id: el slug de texto devuelve 0 resultados.
 */
import type { CategoriaId } from "./tipos.ts";

export const CATEGORIAS_MODO: readonly { id: CategoriaId; nombre: string }[] = [
  { id: 1, nombre: "Supermercados" },
  { id: 2, nombre: "Gastronomía" },
  { id: 3, nombre: "Indumentaria" },
  { id: 4, nombre: "Farmacias, Perfumerías y Peluquerías" },
  { id: 5, nombre: "Combustibles" },
  { id: 6, nombre: "Deportes" },
  { id: 7, nombre: "Hogar" },
  { id: 8, nombre: "Automóviles" },
  { id: 10, nombre: "Electro y Tecnología" },
  { id: 11, nombre: "Ferretería y Pinturerías" },
  { id: 12, nombre: "Mascotas" },
  { id: 13, nombre: "Jugueterías y Librerías" },
  { id: 14, nombre: "Entretenimiento" },
];
