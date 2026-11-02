# Quickstart: verificar la spec 007

```bash
npm ci                                  # compila el motor (prepare) y deja dist/
npm run lint && npm run typecheck && npm run test
```

## Metro en los tres destinos, desde un checkout limpio

```bash
rm -rf packages/motor/dist && npm ci
cd apps/mobile
npx expo export --platform ios --output-dir /tmp/v-ios
npx expo export --platform android --output-dir /tmp/v-android
npx expo export --platform web --output-dir /tmp/v-web
```

## Simulador de iOS (Expo Go)

1. `npm run start -w @vuelto/mobile` y abrir en el simulador.
2. Onboarding con Galicia, Santander, Provincia y Macro.
3. Inicio → Coto: Galicia, "Te quedan ≈$6.500 de tope", según 3 compras de octubre.
4. Tipear 1, 0, 0, 0, 0: la tarjeta cambia en cada tecla y termina en "Te devuelven ≈$2.000", sin esqueleto.
   Con el inspector de red de Expo abierto, no hay pedidos.
5. Ver detalle → Usar Galicia → Guardar: Topes muestra Galicia ≈$4.500 según 4 compras.
6. Cerrar la app y abrir: sigue en Inicio y la compra está en Mis compras.

## Web y EAS

```bash
npm run web -w @vuelto/mobile
cd apps/mobile && npx eas-cli@latest build --platform android --profile preview
```
