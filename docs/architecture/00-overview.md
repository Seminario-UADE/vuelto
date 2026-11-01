# Overview

Vuelto recomienda con qué medio de pago pagar una compra concreta y controla
el tope de reintegro mensual consumido. No es un listado de promociones.

## Núcleo técnico: tres piezas, un mismo patrón de extracción

1. **Motor de reglas** — paquete TypeScript propio, sin dependencias, con su
   propia suite de tests. Es una función pura sin llamadas de red propias y
   lo ejecuta **la app**, en el dispositivo y sin red, sobre el estado que
   tiene en Redux: la recomendación se recalcula en vivo mientras se tipea el
   monto. Lo que cruza datos de varios usuarios (gasto en grupo) lo ejecuta una
   Edge Function (ADR-010, RNF-02). Evalúa combinaciones válidas (medio de pago × compra
   × tope ya consumido × jurisdicción × acumulabilidad) y devuelve la óptima.
   Es código **determinístico** — el LLM nunca entra acá.
2. **Ingesta automática** — la letra chica de cada promoción viene en prosa
   legal no estructurada. Un LLM (Gemini) la convierte en los atributos de
   `01-data-models.md`, contra un esquema forzado. Corre offline, en lote,
   fuera del camino crítico. Un borrador entra a la base que usa el motor
   automáticamente si completa el esquema — sin revisión humana; si no lo
   completa, se descarta solo.
3. **Registro por ticket** — mismo extractor, otra fuente de texto sucio: el
   usuario fotografía el comprobante y el extractor obtiene monto, comercio,
   medio de pago y descuento. Es lo que alimenta el consumo de tope. El
   usuario confirma antes de que el registro sea válido.

## Stack

| Pieza | Elección | Corre en |
|---|---|---|
| Motor de reglas | TypeScript, paquete propio | Dispositivo (app) y, para el grupo, Edge Function |
| Cliente mobile | Expo (React Native) con Redux Toolkit | Dispositivo |
| Backend / DB | Supabase (Postgres + Auth + RLS; Edge Functions solo para ticket, grupo e invitaciones) | Servidor |
| Extractor | Gemini API | Servidor únicamente |
| Ingesta / scraping | Playwright | Servidor (dónde exactamente: pendiente, ver `04-infrastructure.md`) |
| Testing | Vitest (motor) + Expo Go (ejecución manual) | — |

## Flujo de datos, de punta a punta

```
Fuentes web (bancos/billeteras)
  → Playwright captura el render
  → Supabase.capturas_crudas (contenido crudo)
  → Gemini extrae contra esquema (offline, batch)
  → validación automática de esquema (sin persona)
  → base validada (Postgres, corpus legible por los usuarios autenticados)
  → sincronización incremental a la app (store de Redux)
  → motor de reglas (en la app, selector memoizado) ← perfil + compras del período + monto que se tipea
  → recomendación al usuario, recalculada en vivo

Ticket fotografiado
  → Gemini extrae (Edge Function, server-side)
  → usuario confirma
  → registro de compra → actualiza tope consumido
```

Detalle completo del producto: `../product/`.
Razonamiento de cada decisión de stack: `../decisions/`.
