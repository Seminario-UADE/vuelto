# Build de respaldo para el pitch (issue #56)

El camino principal del pitch es Expo Go (QR, sin compilar). Este APK es el
respaldo por si Expo Go o el servidor de desarrollo fallan ese día.

## Link de descarga

| Build | Fecha | Link | Probado en |
|---|---|---|---|
| — | pendiente | pendiente | pendiente |

El link sale de `eas build` (página del build en expo.dev, distribución
interna). Cada build nuevo se agrega como fila; el de más arriba es el que se
usa en el pitch.

## Antes del build

1. **La ingesta tiene que haber publicado promos.** El APK no trae promos
   adentro: las baja de Supabase al abrir (`src/sync/`). Si la última corrida
   de `.github/workflows/ingesta.yml` falló, la app no tiene nada que
   recomendar. Revisarlo en la pestaña Actions.
2. **Sesión en EAS** con una cuenta que sea miembro de `joaconzs-team` (el
   `owner` de `apps/mobile/app.json`):

   ```bash
   npx eas-cli@latest login
   ```

3. **Variables públicas en el entorno `preview` de EAS.** El perfil `preview`
   de `apps/mobile/eas.json` las toma de ahí (`"environment": "preview"`); el
   `.env` local no se sube al build porque está en `.gitignore`. Una sola vez,
   desde `apps/mobile/`:

   ```bash
   npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value <url> --visibility plaintext
   npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon key> --visibility sensitive
   ```

   Solo la URL y la anon key (las protege RLS). **Nunca** la service role key
   ni la API key de Gemini: todo lo que lee la app termina dentro del APK
   (`docs/architecture/04-infrastructure.md`, «Secretos»).

## Build

Desde `apps/mobile/`:

```bash
npx eas-cli@latest build --platform android --profile preview
```

Corre en los servidores de Expo (no hace falta Android Studio). El free tier
da 15 builds por mes: no gastarlos en pruebas que se pueden hacer con Expo Go.
Al terminar, EAS muestra el link y un QR para instalar el APK.

## Prueba en un Android real

Instalar el APK desde el link (permitir apps de origen desconocido) y revisar:

- [ ] La app abre, se puede crear cuenta o entrar.
- [ ] Al entrar, sincroniza promos de Supabase (no quedan los datos de
      ejemplo de octubre).
- [ ] Con el «+» del centro (Comprar): elegir un comercio con promo hoy
      (paso 1), poner el monto (paso 2) y ver la recomendación (paso 3). Al
      cambiar el monto y volver, la recomendación cambia.
- [ ] «Voy a pagar con…» deja la compra por confirmar en Inicio; al
      confirmarla («Guardar compra», en «Revisá tu compra») queda guardada.
- [ ] En Inicio, «Tus topes» → «Ver todos» muestra el tope consumido como
      estimado y con su base.
- [ ] En modo avión, con la app ya sincronizada, la recomendación sigue
      funcionando (el motor corre en el celular).

Anotar en la tabla de arriba el modelo de celular y la versión de Android.
