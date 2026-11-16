# ADR-008: Contactos vinculados para el gasto en grupo (nivel 1)

Estado: **aceptado** (15/10/2026). Reemplaza el "nivel 0" de
`../product/alcance-mvp.md` §Gasto en grupo. Auditoría previa y preguntas
que este ADR responde: `../product/propuesta-contactos-gasto-grupo.md`.

## Context

El nivel 0 resolvía "¿quién de nosotros paga?" con integrantes declarados a
mano: quien arma el grupo carga los medios de pago de cada uno, y el motor
no usa topes ajenos (criterio de RF-19). Eso tiene dos problemas:

- Hay que re-declarar a las mismas personas en cada grupo, y los medios que
  carga un tercero se desactualizan sin que el dueño se entere.
- Sin topes ajenos, el motor puede recomendar que pague alguien que ya
  agotó el tope de esa promo: el mismo error que Vuelto existe para evitar
  en la compra individual.

Leer datos de otra cuenta choca con dos reglas vigentes: "un usuario no
puede leer el registro de otro" (`privacidad.md`) y "la service role key
solo la usa el proceso de ingesta" (RNF-05). Este ADR define cómo hacerlo
sin romper ninguna de las dos.

Que el gasto en grupo se calcule en una Edge Function (ADR-010 §3, RNF-02;
antes, ADR-001 §Actualización) es lo que hace viable el cambio: los datos del
contacto llegan al motor del lado del servidor y no hace falta mandarlos al
celular de nadie. Eso sigue valiendo aunque la recomendación individual ahora
se calcule en la app.

## Decision

### 1. Vínculo por invitación, sin buscador

- Desde su perfil, el usuario genera una **invitación**: un link (deep link
  de la app) y un QR que codifica ese mismo link.
- No existe búsqueda de usuarios por nombre, email ni ningún otro dato.
- La invitación es **de un solo uso** y **vence a las 24 h**. Se guarda
  solo el hash del token.
- Quien abre la invitación ve una **pantalla de aceptación** que dice quién
  invita y qué se va a compartir (punto 3). El vínculo se crea solo si
  acepta. Abrir el link no alcanza: así un link reenviado a un grupo de
  WhatsApp no vincula a nadie sin que lo confirme.
- No crean vínculo: abrir la propia invitación, abrir una invitación de
  alguien que ya es contacto, ni una invitación vencida o usada. Quien abre
  el link sin cuenta pasa por el registro y vuelve a la pantalla de
  aceptación.

### 2. El vínculo es mutuo y revocable por cualquiera de los dos

- El contacto es **simétrico**: si A y B están vinculados, los dos pueden
  usar al otro en un gasto en grupo.
- Cualquiera de los dos puede quitarlo. Quitar **rompe el vínculo para
  ambos** y corta el acceso al instante: la próxima recomendación ya no
  puede leer nada del otro.
- Borrar la cuenta borra sus vínculos (cascada).

### 3. Qué se comparte y qué no

Aceptar un vínculo es el consentimiento para esto, y solo para esto:

| Dato del contacto | ¿Llega al motor? | ¿Lo ve el usuario? |
|---|---|---|
| Nombre para mostrar (lo elige cada uno en su perfil; nunca el email) | No hace falta | Sí: en la lista de contactos, en la pantalla de aceptación y en la recomendación |
| Medios de pago declarados | Sí | Solo el que se recomienda usar ("que pague Ana con su Galicia Visa") |
| Tope consumido por promo | Sí, agregado | No se muestra. Su efecto sí: el reintegro estimado de *esta* compra si paga el contacto |
| Cantidad de compras registradas | Sí (para la base del estimado) | No se muestra el número. La base se dice en palabras: "según las compras que registró Ana" o "Ana no tiene compras registradas: sin base" |
| Compras individuales (monto, comercio, fecha) | **No** | **No** |
| Comercios habituales | No | No |

**Lo que se puede inferir, y se consiente igual.** El reintegro estimado
de una compra es lo que hace útil la recomendación, pero deja inferir algo
del tope del contacto: si el estimado sale recortado (por ejemplo $3.000 en
vez del 20% del monto), el usuario puede deducir cuánto tope le queda a
Ana en esa promo. Y la base en palabras deja saber si Ana registró alguna
compra o ninguna. No se oculta: la pantalla de aceptación lo dice
("el otro puede deducir cuánto reintegro te queda en una promo a partir de
la recomendación"), y queda dentro del consentimiento.

La base en palabras, sin el número de compras, es la forma del Principio V
para topes ajenos: el estimado sigue siendo estimado y con su base, sin
exponer metadata del otro.

### 4. Cómo se leen los datos ajenos

- **Ninguna policy de RLS** de `perfil` ni de `compra` se abre a otros
  usuarios. Siguen siendo de lectura exclusiva del dueño.
- La Edge Function del motor corre con el **JWT del usuario** que pide la
  recomendación, no con la service role key (RNF-05 sigue intacto).
- Llama a una función SQL `security definer` que recibe los ids de los
  contactos, **verifica que cada uno esté vinculado con `auth.uid()`**, y
  devuelve solo lo de la tabla del punto 3 (medios + tope consumido
  agregado por promo + cantidad de compras). Un id no vinculado se
  rechaza.
- La aceptación de una invitación pasa por otra función `security definer`
  (`aceptar_invitacion(token)`), llamada con el JWT de quien acepta: busca
  la invitación por hash, valida vencimiento, uso y auto-vínculo, y crea el
  contacto. Quien acepta no lee la tabla `invitacion` directamente (su RLS
  solo deja ver las invitaciones propias al emisor). El nombre para mostrar
  del emisor que se ve en la pantalla de aceptación sale de esa misma vía.
- Las dos funciones fijan `set search_path` y se les quita el permiso de
  ejecución a `anon`; solo las ejecuta `authenticated`.
- El cliente recibe la recomendación, nunca el input del motor.

### 5. Motor y determinismo

- El motor sigue siendo una función pura: recibe un **snapshot** ya
  materializado (`integrantes[]` con sus medios, topes consumidos y base,
  más `ahora`). No lee de la base.
- Objetivo: el mismo que en la compra individual (RF-03), maximizar el
  reintegro estimado de esta compra, ahora sobre la unión de medios del
  grupo, cada uno con el tope de su dueño.
- Desempate determinístico: primero quien pide la recomendación; después
  los demás en orden canónico por id.
- Un tope sin base (contacto con cero compras) se trata igual que el del
  propio usuario sin compras, pero la recomendación lo dice explícitamente
  (Principio V).

### 6. Registro de la compra cuando paga otro

- Cada uno registra **sus propias** compras, como en la compra individual
  (ticket, excepción o manual). Nadie escribe en la cuenta de otro.
- Hasta que el contacto registre y confirme la compra, su tope no cambia
  (Principio V). La recomendación siguiente puede sobrestimar su tope; se
  acepta, porque es el mismo comportamiento que ya tiene el usuario
  individual que no registra.

### 7. Integrantes sin cuenta

Se mantienen: un grupo puede mezclar contactos vinculados e integrantes
declarados a mano (el nivel 0). Para un integrante declarado no hay tope
conocido; la recomendación lo indica.

### 8. Fuera de este ADR

- Recomendar dividir el pago entre dos personas para aprovechar dos topes.
- Promoción de débito y redondeo de la división (RF-20): siguen en
  `pendientes.md`.

## Rationale

- Resuelve el error de fondo del nivel 0 (recomendar a alguien con el tope
  agotado) sin abrir el historial de compras de nadie.
- La invitación con aceptación explícita es el consentimiento: no hace
  falta una pantalla de permisos aparte, y el usuario sabe qué comparte
  antes de hacerlo.
- Sin buscador no hay directorio de usuarios que proteger ni enumerar.
- Mantener las reglas de RLS como están y concentrar el acceso cruzado en
  una sola función auditable es más fácil de defender (y de testear) que
  policies cruzadas por tabla.

## Consequences

- RF-19 cambia de criterio (ahora sí usa topes ajenos) y se suman RF-21 y
  RF-22 (`requisitos.md`). Sigue siendo prioridad **C**: última del MVP
  (`roles-scrum.md`, equipo de 4).
- `privacidad.md` incorpora los datos compartidos entre contactos y deja
  de listar el gasto en grupo como fuera de alcance.
- Tablas nuevas `invitacion` y `contacto`, con RLS en la misma migración
  (RNF-07). La función `security definer` necesita tests propios: contacto
  vinculado, no vinculado, vínculo quitado.
- La suite del motor suma casos de grupo: tope ajeno agotado, contacto sin
  base, integrante sin cuenta, empate.
- Abrir un deep link requiere un esquema propio de la app; en Expo Go se
  prueba con el esquema `exp://`, y en el build de EAS con el definitivo.
- `guion.md` (Slide 19) ubicaba "cuentas y topes reales del grupo" después
  del MVP. Ese guion ya se presentó; la próxima presentación tiene que
  reflejar este cambio.
- Prerrequisito para `/speckit-plan`: la constitución (Principio II) todavía
  dice que el motor corre en el dispositivo, en contra de ADR-001
  §Actualización y RNF-02.

## Actualización (15/11/2026, issue #54, spec 016)

Al implementar el gasto en grupo (`specs/016-gasto-grupo/`), el Product Owner
decidió estos cambios, que ajustan el texto de arriba sin cambiar el
objetivo: decidir quién paga con el tope de cada uno, sin abrir el historial
de nadie.

- **§3 Qué se comparte.** Para calcular el tope de un contacto no alcanza con
  un "tope consumido agregado": el consumo depende del período (mes o semana),
  de los topes compartidos entre promos y del descuento que falta informar, y
  todo eso está en el motor (`tope.ts`). Agregarlo en SQL duplicaría las
  reglas del motor fuera de sus tests. Por eso la función de la base entrega
  las **compras del período reducidas a promoción, fecha, monto y descuento
  obtenido** (sin comercio, medio de la compra, origen, texto ni id), **solo a
  la Edge Function**. Ahí el motor calcula y nada de eso sale (D4). La fila
  "Compras individuales" de la tabla pasa a: ¿Llega al motor? *Sí, reducidas,
  solo en el servidor*; ¿Lo ve el usuario? *No*.
- **§3 Lo que se puede inferir.** El reintegro estimado de un contacto se
  calcula y se muestra en **escalones de $100** (D9). Repetir consultas
  cambiando el monto, el comercio o el día deja deducir más sobre cómo usa sus
  topes. El redondeo lo hace menos preciso, pero no lo impide. Se acepta y la
  pantalla de aceptación lo dice.
- **§3 La base en palabras.** Se dice sobre las compras que consumieron el
  tope de **la promo que se aplica**, no sobre cualquier compra del período
  (D10, constitución §V). Hay cuatro casos: con compras, sin compras, la promo
  no informa tope y tope por compra.
- **§4 Cómo se leen los datos ajenos.** Las funciones `security definer` viven
  en el schema `contactos_privado`. En `public` hay envoltorios
  `security invoker` (PostgREST solo expone `public`, y
  `estructura.test.sql` prohíbe `security definer` ahí). La función que lee los
  datos de los contactos exige, además del JWT del usuario, una **clave de
  servidor** que solo tiene la Edge Function (secreto de Vault y variable
  `GRUPO_CLAVE_SERVIDOR`). Si no, la app podría llamarla directo con la misma
  sesión (D8). No es la service role key: RNF-05 sigue intacto.
- **§5 Desempate.** Se decide **sobre las cifras que se muestran**: el
  reintegro de quien pide redondeado al peso y el de cada contacto en
  escalones de $100. Así la pantalla nunca contradice la decisión. Para pagar,
  hace falta al menos $1 a la vista. El orden canónico es el id en minúsculas,
  comparado por código de carácter.
- **§7 Integrantes sin cuenta.** Solo con un nombre, que no sale del teléfono
  ni se guarda (D5). No pueden ser quien paga, pero cuentan para la división.
- **§8 Débito y redondeo, resueltos.** La división descuenta el reintegro igual
  para débito y crédito, y el reintegro le llega a quien paga (D2). Se divide
  en pesos enteros y el resto se reparte de a $1 en el orden del desempate
  (D3).
