# ADR-009: Núcleo funcional y capa imperativa (functional core, imperative shell)

Estado: **aceptado** (18/10/2026), validado por el equipo en el PR de la
issue #33.

## Context

ADR-001 y la constitución (§II) fijan que el motor es una función pura, sin
dependencias ni red. Lo que no estaba escrito es cómo se modelan los datos
del dominio (promoción, compra, perfil, recomendación) ni cómo se organiza
el código con efectos (base, red, LLM) de las Edge Functions. La pregunta
apareció al definir el contrato de tipos (issue #33): ¿clases o
interfaces? ¿Hace falta controller, service y repositorio?

## Decision

Se adopta el patrón **functional core, imperative shell**:

- **Núcleo funcional** (`packages/motor`): funciones puras sobre datos
  planos. Los datos del dominio son `interface`/`type` de TypeScript, no
  clases. Sin I/O, sin LLM, sin reloj: todo lo que varía entra por
  parámetro (`ahora`, compras del período). La excepción son los errores
  (`class PerfilSinMediosError extends Error`): no son datos del dominio ni
  viajan como JSON, y la capa imperativa los distingue con `instanceof`.
- **Capa imperativa** (Edge Functions): hace todo el I/O. Verifica la
  sesión, lee de Postgres, llama a Gemini, arma los datos que el núcleo
  necesita, lo invoca y responde. Se organiza en capas:

```
handler (index.ts)  ── rol de controller: HTTP, sesión, validar body, códigos de respuesta
      │                 y composition root: arma las piezas de abajo
service             ── caso de uso: qué datos juntar y qué regla aplicar; llama al motor
      │
repositorios        ── acceso a datos, detrás de una interfaz
```

| Pieza | Forma | Por qué |
|---|---|---|
| Repositorios | Clases que implementan una interfaz (`RepositorioPromociones`, `RepositorioCompras`…), inyectadas por constructor | Las comparten varias Edge Functions (`recomendar`, `topes`, grupo) y permiten testear sin base, con una implementación en memoria |
| Services | Clases (`ServicioRecomendacion`, `ServicioTopes`, `ServicioGrupo`) que reciben los repositorios por constructor | Concentran el caso de uso; dependen de interfaces, no del cliente de Supabase |
| Controller | El handler del `index.ts` de cada Edge Function, sin clase | Con un endpoint por función, una clase controller no agrega nada |
| Adaptadores externos | Interfaz más implementación (ej. `ExtractorTicket` sobre Gemini) | Para testear la issue #48 sin llamar a Gemini |
| Autenticación | Función compartida `autenticar(req)` | Lo pesado lo hacen Supabase Auth y el RLS; lo que importa es que ninguna función se la saltee |

El controller depende solo del service, nunca de los repositorios: así no
hay dos caminos a los datos y las reglas del caso de uso no se saltean.

El código común vive en `supabase/functions/_shared/` (repositorios,
`autenticar`, validación). Las piezas se crean **por request** en el
handler, porque el cliente de Supabase se crea con el token del usuario
para que el RLS aplique (`auth.uid()`); son objetos sin estado y crearlos
no tiene costo apreciable.

## Rationale

- **Los datos viajan como JSON** (Postgres → Edge Function → motor → app).
  `JSON.parse` y las consultas devuelven objetos planos; con clases de
  dominio habría que reconstruir instancias en cada borde, sin ganar nada.
- **Determinismo y testeo** (argumento central del proyecto): una función
  pura sobre datos planos da la misma salida para la misma entrada y se
  testea con un objeto literal.
- **La lógica cruza entidades**: recomendar necesita compra, perfil,
  promociones y compras del período a la vez; no pertenece a ninguna
  entidad en particular.
- **En la capa imperativa las clases sí rinden**: inyección por constructor
  y dependencia de interfaces (SOLID, en particular inversión de
  dependencias) hacen testeable el I/O y evitan duplicar consultas entre
  Edge Functions.
- **Sin framework ni contenedor de DI**: son 3-4 Edge Functions. Gran parte
  del CRUD (perfil, registrar compra, historial) no pasa por código propio:
  la app usa las tablas directo con `supabase-js` y el RLS.

## Consecuencias

- La validación de datos que llegan de afuera (body del request, salida
  del extractor) se hace en la capa imperativa, antes de llamar al núcleo.
- Una entidad con comportamiento propio se expresa como función en el
  núcleo (`esPromocionPublicable(b)`), no como método.
- Todas las Edge Functions siguen la misma estructura: la primera que se
  implemente (issue #43, #45 o #48) crea `_shared/` y las siguientes lo
  reusan.

## Cómo crece si el proyecto escala

El núcleo es lo que **no** cambia: sigue siendo el mismo paquete puro, con
su suite de tests. Lo que crece es la capa imperativa, y cada etapa se
justifica por una señal concreta, no por anticipación.

| Etapa | Señal que la dispara | Cambio | ¿MVP? |
|---|---|---|---|
| **1** | — | Lo descrito en este ADR: Edge Functions con handler, services y repositorios inyectados, y `_shared/` común | Sí |
| **2** | Límites de tiempo o memoria de las Edge Functions, procesos largos o en segundo plano (colas, recálculos), varios equipos tocando el backend | Servicio dedicado (por ej. NestJS o Fastify) hosteado fuera de Supabase, con controllers como clases y contenedor de DI (scopes singleton y por request). Supabase sigue como base y Auth. Services y repositorios se reusan; el motor se importa como paquete, igual que hoy | No |
| **3** | Muchas reglas nuevas (más fuentes, más tipos de promo, grupos complejos) | El núcleo se divide en módulos (elegibilidad, topes, grupo) dentro del mismo paquete o en varios; sigue puro | No |

**Invariantes en todas las etapas:** el núcleo no hace I/O, no usa LLM
(ADR-004), es determinístico y recibe `ahora` por parámetro; el contrato de
tipos (`packages/motor/src/tipos.ts`) es la frontera entre las dos capas.
