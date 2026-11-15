# Quickstart: validar el registro de una compra con la foto del ticket

## 1. Tests (sin celular, red ni key)

```bash
npm run test -w @vuelto/mobile
npm run typecheck -w @vuelto/mobile
npm run lint
```

Cubren `src/ticket/`: la lectura en todos sus caminos con la cámara, el servicio y el borrado simulados (SC-002: 0 copias temporales en cada camino), cada fila de la tabla de FR-011 (SC-004), la sugerencia del medio (FR-008) y el rango de fechas (FR-010). Y `data/por-confirmar.ts` con el medio sugerido en vez de marcado.

## 2. En el celular, con Expo Go y el servicio real

Requisitos: el servicio desplegado (spec 013), una cuenta con tarjetas cargadas en el perfil y tickets reales.

1. `npm run start -w @vuelto/mobile` y abrir la app en Expo Go.
2. Perfil → escenario «Normal». Iniciar sesión.
3. «Escanear ticket» → «Sacar foto»: sacar la foto, probar «Repetir», «Usar foto».
4. Verificar en «Revisá tu compra»: monto, comercio y fecha leídos; «¿Con qué pagaste?» sin medio marcado y la nota correcta (FR-008); la fecha se puede cambiar (FR-010). Guardar.
5. Verificar que la foto **no** aparece en la galería del celular.
6. Repetir con «Elegir de la galería» y con una foto en HEIC (iPhone).
7. Cronometrar 10 lecturas con 4G o Wi-Fi: al menos 9 en menos de 8 segundos (SC-001).
8. Probar sin sesión (FR-002), denegando el permiso de la cámara (FR-003) y en modo avión (sin conexión, FR-011).

## 3. En web (vuelto.expo.app) y para la demo

Perfil → escenario «Ticket de ejemplo»: «Escanear ticket» lleva a «Revisá tu compra» con la lectura de ejemplo y la sugerencia «El que dice el ticket», sin cámara ni servicio. Los escenarios «Ticket ilegible» y «Sin red» muestran sus mensajes.

## 4. Revisión de privacidad

`rules-guardian` sobre el diff: la key del proveedor no aparece en la app (regla 3) y ningún camino deja una copia temporal de la foto ni la guarda (regla 4, constitución 3.0.2).
