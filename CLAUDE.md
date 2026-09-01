# Vuelto

> Asistente de decisión de medio de pago y control de topes de reintegro.
> MVP — Seminario de Integración Profesional (UADE).

## Qué es

En Argentina, las promociones bancarias cambian por día, billetera, banco y tarjeta,
y tienen tope de reintegro mensual compartido entre promos. Vuelto no lista
promociones — recomienda **qué medio de pago usar en una compra concreta** y
controla **cuánto tope de reintegro queda**, que hoy es invisible para el
usuario.

> **Regla de oro:** si una funcionalidad se puede describir como "mostrar
> promociones", no es este producto.

Contexto completo del producto: `docs/product/`.
Arquitectura técnica: `docs/architecture/`.
Decisiones y su razonamiento: `docs/decisions/`.
Registro de sesiones de trabajo con IA (para la cátedra): `docs/bitacora-prompts.md`.

## Estado

Etapa de definición del problema / research. **No hay código todavía.**
Cuando se inicialicen los paquetes, actualizar este archivo con comandos
reales de dev/build/test.

## Stack decidido (costo $0 durante el cuatrimestre)

| Pieza | Elección |
|---|---|
| Motor de reglas | Paquete TypeScript propio, sin dependencias, con su suite de tests. Corre **en el dispositivo** |
| Cliente mobile | Expo (React Native) |
| Backend / DB | Supabase (Postgres + Auth) |
| Extractor | Gemini API — **siempre del lado del servidor**, nunca en el cliente |
| Ingesta / scraping | Playwright (dónde corre el cron: pendiente) |
| Testing | Vitest sobre el motor + Expo Go para ejecución manual |

## Reglas que la IA siempre debe seguir en este proyecto

- **El modelo de lenguaje nunca entra al motor de reglas.** La recomendación
  al usuario sale de código determinístico. El LLM vive solo en la ingesta
  (offline, batch, fuera del camino crítico). No proponer "preguntarle al
  modelo cuál medio de pago conviene": mata el determinismo, los tests y el
  argumento de innovación tecnológica de la materia.
- **Salida del extractor siempre estructurada contra un esquema.** Campos
  ausentes se devuelven `null` explícito — nunca inventados ni inferidos.
  Esquema: `{"type": ["string", "null"]}`, no campos opcionales.
- **La API key de Gemini nunca va en la app del celular.** Letra chica → script
  de ingesta. Ticket → Edge Function de Supabase.
- **Las imágenes de ticket no se persisten** (se mandan a Gemini y se
  descartan). Sí se persiste el texto extraído junto al registro de compra.
- **Ningún dato de promoción se publica sin revisión humana.** El extractor
  llena un borrador en cola; una persona aprueba, corrige o rechaza.
- **Topes de reintegro siempre se muestran como estimados, con su base**
  (ej. "≈$18.000, según 4 compras registradas"). Nunca una cifra falsamente
  precisa.
- **Row-level security se escribe al crear cada tabla en Supabase**, no después.

## Fuera de alcance (MVP), explícito

Integración bancaria directa, lectura automática de resúmenes/movimientos,
publicación de promos sin revisión humana, cobertura nacional, app nativa nuda
(se usa Expo).
