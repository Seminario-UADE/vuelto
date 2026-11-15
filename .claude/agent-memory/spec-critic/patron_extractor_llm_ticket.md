---
name: patron-extractor-llm-ticket
description: Specs del extractor LLM de tickets (013, issue #48, Groq) — contrato que diverge de LecturaTicket, descuento ambiguo vs. descuentoObtenido, inferencia del LLM no testeable, límites de tamaño base64, orden recorte/enmascarado
metadata:
  type: project
---

Visto 2026-11-10 en `specs/013-extraer-ticket/spec.md`:

- **Contrato divergente**: la spec dice usar `LecturaTicket` pero devuelve otra forma (medio = 4 campos crudos vs. `MedioDePago | null`; `descuento` que la app no tiene; errores como código vs. `error: string`). Nadie dice quién adapta. Status HTTP y forma del cuerpo delegados a "contracts/".
- **Descuento**: incluye promos del comercio; si #49 lo mapea a `descuentoObtenido`, consume tope bancario. Varias líneas de descuento: ¿sumar? (sumar = deducir).
- **Pago mixto**: monto = total, pero el tope se consume por lo pagado con tarjeta.
- **"Nunca deducido" con LLM**: red por BIN, año de 2 dígitos, normalizar "MASTERCARD"→"master"; ningún test lo puede verificar con proveedor simulado (SC-001 tautológico).
- **Tamaño**: 4 MB crudos ≠ 4 MB base64 (límite del proveedor).
- **Privacidad**: recorte a N caracteres antes del enmascarado deja tarjetas parciales; "motivo del error de esquema" en logs puede ecoar valores.
- **Sesión**: flujo sin cuenta (012) vs. "sesión válida".

2da pasada (mismo día): resueltos descuento (eliminado), pago mixto (uno por ticket), sesión (cuenta obligatoria), adaptación de LecturaTicket (#49), orden tapar→recortar, HTTP por código. Quedó abierto: **quién normaliza** (LLM o servicio) — si el LLM devuelve "MASTERCARD" crudo, el vaciado de "red que no existe" lo borra (US1-5 vs US1-8); "no deducir" sigue sin test posible con mock. Nuevos: límite 3 MB decodificado = exactamente 4 MiB en base64 (borde con el límite del proveedor, MB vs MiB); error 4xx del proveedor sin código mapeado; token de tapado para CUIT/DNI sin definir (SC "campo por campo" no comparable); fecha sin cota inferior; criterio de la prueba manual sin rama "falla".

**Why:** el post-procesamiento determinístico se testea bien, pero el comportamiento del LLM y el empalme con la app quedan sin criterio.
**How to apply:** en #51 (letra chica) y #49, revisar forma exacta contra el tipo de la app, qué campo crudo alimenta al tope, y qué del "no inferir" es verificable sin red. Ver [[patron-capa-servidor-sobre-motor]], [[patron-flujo-ui-estado-local-nuevo]].
