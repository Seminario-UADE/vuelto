# Overview

Vuelto recomienda con qué medio de pago pagar una compra concreta y controla
el tope de reintegro mensual consumido. No es un listado de promociones.

## Núcleo técnico: tres piezas, un mismo patrón de extracción

1. **Motor de reglas** — paquete TypeScript propio, sin dependencias, con su
   propia suite de tests. Corre **en el dispositivo**: recomendación
   instantánea, sin red. Evalúa combinaciones válidas (medio de pago × compra
   × tope ya consumido × jurisdicción × acumulabilidad) y devuelve la óptima.
   Es código **determinístico** — el LLM nunca entra acá.
2. **Ingesta asistida** — la letra chica de cada promoción viene en prosa
   legal no estructurada. Un LLM (Gemini) la convierte en los atributos de
   `01-data-models.md`, contra un esquema forzado. Corre offline, en lote,
   fuera del camino crítico. Todo borrador pasa por revisión humana antes de
   entrar a la base que usa el motor.
3. **Registro por ticket** — mismo extractor, otra fuente de texto sucio: el
   usuario fotografía el comprobante y el extractor obtiene monto, comercio,
   medio de pago y descuento. Es lo que alimenta el consumo de tope. El
   usuario confirma antes de que el registro sea válido.

## Stack

| Pieza | Elección | Corre en |
|---|---|---|
| Motor de reglas | TypeScript, paquete propio | Dispositivo (app) y backend |
| Cliente mobile | Expo (React Native) | Dispositivo |
| Backend / DB | Supabase (Postgres + Auth) | Servidor |
| Extractor | Gemini API | Servidor únicamente |
| Ingesta / scraping | Playwright | Servidor (dónde exactamente: pendiente, ver `04-infrastructure.md`) |
| Testing | Vitest (motor) + Expo Go (ejecución manual) | — |

## Flujo de datos, de punta a punta

```
Fuentes web (bancos/billeteras)
  → Playwright captura el render
  → Supabase.capturas_crudas (contenido crudo)
  → Gemini extrae contra esquema (offline, batch)
  → cola de revisión humana
  → base validada (Postgres)
  → motor de reglas (dispositivo) ← perfil del usuario + tope consumido
  → recomendación al usuario

Ticket fotografiado
  → Gemini extrae (Edge Function, server-side)
  → usuario confirma
  → registro de compra → actualiza tope consumido
```

Detalle completo del producto: `../product/`.
Razonamiento de cada decisión de stack: `../decisions/`.
