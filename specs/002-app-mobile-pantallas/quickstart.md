# Quickstart: validar la app mobile

## Requisitos

- Node ≥ 22.13 (`.nvmrc`), `npm ci` en la raíz.
- Expo Go (SDK 58) en un iPhone/Android, o Xcode con iOS Simulator.
- Opcional: `apps/mobile/.env` copiado de `.env.example` (la app abre sin él).

## Chequeos automáticos

```bash
npm run lint
npm run typecheck
npm run test
grep -q '@vuelto/motor' apps/mobile/package.json && echo FALLA || echo OK
```

Esperado: todo verde; `OK` en la última línea. Los tests de `apps/mobile` cubren invariantes de
fixtures (≈ y base, fechas 2026, cuentas que cierran), contratos de contacto sin campos prohibidos,
formato de dinero y ausencia de hex fuera de `src/theme.ts`.

## Correr la app

```bash
npm run start -w @vuelto/mobile
```

Escanear el QR con Expo Go (o `i` para el simulador).

## Recorridos de validación

1. **Onboarding** (app recién instalada): Bienvenida → Medios (Continuar deshabilitado sin medio con cobertura) → Comercios ("Saltar" en el header) → Primera respuesta (tarjeta oscura) → sheet Guardar perfil → Inicio. Reabrir: entra directo a Inicio.
2. **Respuesta en 1 toque** (US1): Inicio → tocar "Coto" → tarjeta "Te conviene Galicia Visa crédito" en la misma pantalla, sin "Te devuelven". Cargar 24500 → "Te devuelven ≈$4.900 · te sale ≈$19.600".
3. **Detalle y registro por recomendación**: "Ver detalle" → Con qué pagar → "Usar Galicia" → sheet con Galicia marcado → Guardar compra → aviso → Mis compras muestra Coto con "Recomendación".
4. **Ticket** (US2): Comprar → Escanear ticket → disparador → sheet sin medio marcado y "Guardar compra" deshabilitado → elegir medio → guardar.
5. **Topes** (US4): cuatro estados; sin "Te quedan" agregado; "Se reinician" por periodo.
6. **Bordes**: Inicio → "YPF" (sin promo hoy); "Farmacity" (tope agotado).
7. **Contactos y grupo** (US5): Perfil → Invitar contacto; Perfil → quitar Mateo (sheet); Con qué pagar → "¿Pagan entre varios?" → Armar grupo → Gasto en grupo.
8. **Invitación por link**: con Expo Go en el simulador,
   ```bash
   xcrun simctl openurl booted "exp://127.0.0.1:8081/--/i/demo-lucia"
   ```
   Probar también `demo-vencida`, `demo-usada`, `demo-propia`, `demo-contacto`.
9. **Accesibilidad**: Ajustes → Accesibilidad → Pantalla y tamaño de texto → texto más grande al máximo; repetir 1–7: nada cortado ni tapado, Inicio con topes en una columna.
10. **Modo oscuro del sistema**: activarlo; la app sigue clara y sin controles oscuros.
