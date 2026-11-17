# Auditoría de secretos y privacidad

Evidencia de RNF-04 a RNF-07 (`requisitos.md`), issue #55. Fecha de la pasada: 2026-11-17.
Se repite antes de cada entrega: el script corre solo en cada PR (job `auditar-secretos` del CI)
y los tests pgTAP en el job `supabase-rls`.

| Requisito | Qué se verificó | Resultado |
|---|---|---|
| RNF-04 | Keys de Gemini y Groq ausentes del bundle de la app | 0 resultados |
| RNF-05 | Service role key ausente del bundle y de los archivos versionados | 0 resultados |
| RNF-06 | Sin buckets ni objetos de Storage; sin columnas de imagen en la base | Cumple |
| RNF-07 | Toda tabla de `public` con RLS habilitada, en la misma migración que la crea | Cumple (10 de 10) |

## 1. Secretos en el bundle (RNF-04, RNF-05)

`scripts/auditar-secretos.sh` exporta el bundle web (`npx expo export --platform web`) y busca:

- key de Gemini (`AIza…`) y de Groq (`gsk_…`);
- service role key: cada JWT del bundle se decodifica y se marca si su payload dice
  `role: service_role` (así la anon key, que es pública y va en el bundle, no da falso
  positivo), más el formato nuevo `sb_secret_…`;
- los nombres `GEMINI_API_KEY`, `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `GOOGLE_API_KEY`
  (en el bundle no tienen por qué aparecer nunca);
- los mismos patrones de valores en todos los archivos versionados del repo (`git ls-files`),
  porque RNF-05 dice «ni en el cliente ni en el repo»;
- el valor literal de tus keys reales, si están en el entorno (`set -a; . supabase/.env; set +a`).
  Es la prueba más fuerte, pero solo corre local: el CI no recibe los secrets del repo.

Garantías del propio script:

- **Primero prueba que detecta.** Planta cinco keys falsas en una carpeta temporal y exige
  que las encuentre, que ignore la anon key y que no imprima ningún valor. Si eso falla, termina
  con error: un «0 resultados» de un detector que no detecta no prueba nada. Se corre solo con
  `--autotest`.
- **Nunca imprime un secreto.** Informa tipo de patrón, archivo y cantidad.
- Falla (código 2) si el bundle está vacío o sin `.js`, para que un export roto no pase por limpio.

Resultado de la corrida: bundle web de 39 archivos de texto y todos los archivos versionados:
**0 resultados**. Se comprobó además que un bundle con una key de Groq plantada da código 1 y
no la imprime, y que el valor literal definido en el entorno también se detecta.

Límites: se audita el bundle **web**; el de iOS/Android sale del mismo código fuente (mismo
Metro, mismas variables `EXPO_PUBLIC_*`), pero no se exportó. Un secreto cargado a mano en un
archivo con un formato que no sea ninguno de los patrones de arriba no se detecta.

## 2. Imágenes de ticket (RNF-06)

- **Migraciones** (`supabase/migrations/`): ninguna menciona Storage ni buckets. La única columna
  vinculada al ticket es `compras.texto_extraido` (texto, no imagen); `20261101000007_compras.sql`
  lo deja declarado.
- **Base reiniciada** (`supabase db reset` con todas las migraciones y la siembra): `storage.buckets`
  y `storage.objects` tienen 0 filas; ninguna columna de `public` se llama `imagen`, `image`,
  `foto`, `photo` ni `ticket_img` ni es `bytea`.
- **Tests** que lo sostienen: `supabase/tests/database/privacidad_storage.test.sql` (nuevo: Storage
  sin buckets ni objetos) y `estructura.test.sql` (sin columnas de imagen, existente).
- `supabase/config.toml` no define ningún bucket.

## 3. RLS por tabla (RNF-07)

Generado contra Supabase local (`supabase db reset`, luego consulta a `pg_class` y `pg_policies`):

```sql
select c.relname as tabla, c.relrowsecurity as rls_habilitada, count(p.policyname) as policies
from pg_class c join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = 'public' and p.tablename = c.relname
where n.nspname = 'public' and c.relkind in ('r', 'p')
group by c.relname, c.relrowsecurity order by 1;
```

| Tabla | RLS habilitada | Policies |
|---|---|---|
| `bancos` | sí | 2 |
| `capturas_crudas` | sí | 0 (a propósito: solo la service role) |
| `categorias` | sí | 2 |
| `comercios_habituales` | sí | 1 |
| `compras` | sí | 1 |
| `contactos` | sí | 2 |
| `invitaciones` | sí | 1 |
| `medios_de_pago` | sí | 1 |
| `perfiles` | sí | 1 |
| `promociones` | sí | 2 |

El test `estructura.test.sql` ya exige que toda tabla de `public` tenga RLS y que toda tabla salvo
`capturas_crudas` tenga al menos una policy: si alguien agrega una tabla sin RLS, el CI falla.
La tabla de arriba es una foto de la fecha; el test es lo que la mantiene al día.

## 4. Pasada de `rules-guardian` sobre todo el repo

Pasada completa (no un diff) de las siete reglas de `CLAUDE.md`. **0 violaciones.**

| Regla | Estado |
|---|---|
| 1. El motor no llama al LLM | Cumple. Sin `dependencies`, sin red ni clientes de modelo. |
| 2. Salida del extractor con `null` explícito | Cumple para el ticket. **Letra chica (Gemini, #51): pendiente**, todavía no hay código. |
| 3. Keys fuera de la app | Cumple. `apps/mobile` solo lee `EXPO_PUBLIC_SUPABASE_URL` y `_ANON_KEY`. |
| 4. Imágenes sin persistir | Cumple. La Edge Function no escribe a disco ni a Storage; en el celular los temporales se borran en un `finally`. |
| 5. Publicación automática con validación | Cumple. Único camino de escritura: `ingesta/src/corpus/publicar.ts`, alimentado solo por lo que pasa la validación. Sin cola de aprobación. |
| 6. RLS en la misma migración | Cumple en las 8 migraciones que crean tablas. |
| 7. Motor en la app, derivados sin guardar | Cumple. El store no guarda recomendaciones ni topes; ningún selector lee el reloj. |

Observaciones de baja prioridad (ninguna bloquea; quedan como posibles mejoras):

- **Temporales del ticket** (`apps/mobile/src/ticket/camara.ts`): `borrar` traga el error de cada
  archivo; si el borrado falla, el temporal queda hasta que se vuelva a abrir Escanear, que limpia
  la caché. Es el respaldo documentado. Además, si `elegir()` lanza en `app/escanear.tsx`, no se
  borra nada en ese camino (improbable que el selector haya dejado un archivo; lo cubre el mismo respaldo).
- **Validación de promos** (`ingesta/src/corpus/validar.ts`): llama a `camposFaltantes` y
  `camposInvalidos` en vez de a `esPromocionPublicable`. Hoy es equivalente, pero si alguien suma una
  condición solo en `esPromocionPublicable`, la ingesta no la aplicaría. Conviene llamar a la función real
  o sumar un test de equivalencia.
- **Texto vacío del ticket** (`supabase/functions/extraer-ticket/servicio.ts`): un ticket sin texto
  devuelve `""` y no `null`. Es coherente con el contrato de la spec 013, no es inferencia.

El agente leyó el código y la configuración; no corrió el script ni exportó el bundle (eso lo
cubre la sección 1).

## 5. Pendiente

- **Extractor de Gemini (#51)**: cuando exista, repetir esta pasada. Hoy el patrón de la key de
  Gemini se busca igual (no debe aparecer en el bundle) y `GEMINI_API_KEY` solo está como
  nombre en `supabase/.env.example`. Hay que revisar que el extractor viva solo en `ingesta/`,
  que su salida use `null` explícito y que el secret de GitHub Actions no se imprima en los logs.
- Probar el script con el valor literal de las keys reales antes del pitch (local, ver sección 1).
