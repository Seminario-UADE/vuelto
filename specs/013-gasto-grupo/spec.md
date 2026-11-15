# Feature Specification: Gasto en grupo — quién de nosotros paga, con contactos vinculados

**Feature Branch**: `claude/54-gasto-grupo`

**Created**: 2026-11-15 · **Revisada**: 2026-11-15 (hallazgos de `spec-critic`: B1–B4, I1–I10, M1–M11; decisiones del PO sobre B1, B4, I7 e I10)

**Status**: Draft

**Input**: issue [#54](https://github.com/Seminario-UADE/vuelto/issues/54) con el alcance reconciliado el 15/11/2026 (absorbe [#130](https://github.com/Seminario-UADE/vuelto/issues/130)), ADR-008, ADR-009, ADR-010 y la revisión `docs/product/revision-gasto-grupo.md` (hallazgos G-01 a G-14).

**Decisión que resuelve (constitución §I)**: un grupo está por pagar una compra concreta (un comercio, hoy, un monto) y quiere saber **quién de ellos conviene que pague y con qué medio**, teniendo en cuenta el tope que le queda a cada uno, y cuánto pone cada uno. No lista promociones: da una sola respuesta para esa compra.

## Contexto y alcance

- **Ya está** (spec 006 US5, sobre datos de ejemplo): las pantallas Contactos, Invitar, Quitar, Aceptar invitación, Armar grupo y Gasto en grupo, con los textos y las restricciones de FR-023 a FR-028 de la spec 006. Hoy corren sobre `apps/mobile/src/data/grupo-simulado.ts` y `fixtures.ts`. No hay tablas, funciones de base ni Edge Function de grupo, y el motor no tiene función de grupo.
- **Esta spec cambia**:
  1. El motor suma la decisión de grupo y la división, como funciones puras sobre una foto de los integrantes (US1).
  2. Los contactos pasan a existir de verdad: invitación, aceptación, lista y quitar, guardados en el servidor (US2).
  3. La recomendación de grupo se calcula en el servidor con los datos reales de quien pide, de sus contactos y del corpus, y la app deja de usar los datos de ejemplo (US3).
- **Decisiones del Product Owner (15/11/2026)**, que esta spec toma como dadas:
  - **D2 · Débito o crédito:** la división descuenta el reintegro igual para un medio de débito o de crédito. El reintegro le llega a quien paga, y la pantalla lo dice.
  - **D3 · Redondeo de la división:** pesos enteros. Cada integrante pone la parte entera de `total / n`; el resto se reparte de a $1 en el orden del desempate. La suma de las partes es exactamente el total.
  - **D4 · Compras de los contactos:** para calcular el tope de un contacto, el servidor usa sus compras del período reducidas a promoción, fecha, monto y descuento obtenido. Esas compras nunca salen del servidor (enmienda de ADR-008 §3 y §4, en el mismo PR).
  - **D5 · Integrantes sin cuenta:** solo un nombre, que nunca sale del teléfono. No pueden ser quien paga, cuentan para la división y no se guardan.
  - **D6 · Funciones con permisos elevados:** viven fuera de `public`; en `public` solo hay envoltorios que delegan sin permisos elevados. La protección actual («ninguna función con permisos elevados en `public`») sigue valiendo sin tocarla.
  - **D7 · Crear la invitación:** no necesita secreto ni datos ajenos, así que no pasa por una Edge Function (enmienda de la tabla de ADR-010 §3).
  - **D8 · Datos de contactos solo para el servidor (B1):** la lectura de los datos de un contacto exige, además de la sesión de quien pide, una **clave de servidor** que solo tiene la Edge Function. Con la sesión sola (desde la app o con cualquier cliente) la lectura se rechaza.
  - **D9 · Sondeo repetido (I7):** el reintegro estimado de un contacto se calcula y se muestra en **escalones de $100**. La pantalla de aceptación y ADR-008 §3 dicen que repetir consultas permite deducir más sobre el uso de los topes.
  - **D10 · Base de un contacto (B4):** se dice sobre las compras que consumieron el tope de **la promo que se aplica**, no sobre cualquier compra del período (constitución §V). Enmienda la frase de ADR-008 §3.
  - **D11 · Cómo entra la invitación (I10):** el link es `vuelto://i/<token>` y el QR codifica ese link. Como WhatsApp y otras apps no hacen tocable ese esquema, Contactos suma «Tengo una invitación» para pegar el link (o el código) que llegó por mensaje. Los universal links quedan para cuando haya dominio.
- **Decisión de esta spec (B3)**: la recomendación se decide **sobre las cifras que se muestran**, para que la pantalla nunca contradiga la decisión. Ver FR-004 y FR-006.
- **Fuera de alcance**: la invitación que se pierde con «Ya tengo cuenta» (G-07, #137), qué hace «Confirmar» (G-09, #138; sigue mostrando el aviso de hoy), el estado vacío de Armar sin contactos (G-11, #139), los universal links con dominio, recomendar dividir el pago entre dos personas (ADR-008 §8), cualquier registro o cobro de deudas y armar un grupo para otro día que no sea hoy.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El motor decide quién paga y cómo se divide (Priority: P1)

Martín, Lucía y Mateo cenan en un restaurante. Mateo tiene una tarjeta con 25% de reintegro hoy, pero ya usó casi todo el tope de esa promo este mes. Lucía tiene otra con 20% y el tope entero. Con la foto de los tres (sus medios, el consumo de sus topes) y la hora, el motor dice que conviene que pague Lucía, cuánto les devuelven y cuánto pone cada uno, y da siempre la misma respuesta para la misma foto.

**Why this priority**: es la regla del producto aplicada al grupo y la pieza que se prueba sin base ni red (constitución §VI). Sin ella, lo demás no tiene qué calcular.

**Independent Test**: suite Vitest del motor con fotos de grupo escritas a mano, sin red ni base. Cubre cada escenario de abajo.

**Acceptance Scenarios**:

1. **Given** un contacto con el tope agotado en la promo que más reintegra, **When** se pide la recomendación, **Then** esa promo no se le asigna, y la respuesta es la mejor opción entre lo que sí aplica, de él o de otro integrante.
2. **Given** un contacto que no consumió el tope de la promo aplicada en el período, **Then** se lo evalúa con el tope completo y su base es «sin compras».
3. **Given** un contacto con 10 compras en supermercados y ninguna sobre la promo de gastronomía que se aplica, **Then** su base es «sin compras», no «con compras» (D10).
4. **Given** una promo aplicada sin tope informado, o con tope por compra, **Then** la base del integrante es «la promo no informa tope» o «tope por compra», respectivamente.
5. **Given** un integrante sin cuenta, **Then** nunca es quien paga, aparece en la división y su resultado dice que no se conoce su tope.
6. **Given** quien pide con un reintegro mostrado de $5.000 y un contacto con un reintegro mostrado de $5.000, **Then** gana quien pide.
7. **Given** dos contactos con el mismo reintegro mostrado y mayor que el de quien pide, **Then** gana el de identificador menor en el orden canónico (comparación por código de carácter del identificador en minúsculas).
8. **Given** quien pide con un reintegro de $5.030 y un contacto con uno calculado de $5.049 (se muestra ≈$5.000), **Then** gana quien pide: la decisión se toma sobre las cifras que se muestran.
9. **Given** un contacto con un reintegro calculado de $40, **Then** se muestra como sin reintegro (el escalón de $100 lo lleva a $0) y nunca es quien paga.
10. **Given** la misma foto con los integrantes en otro orden, **Then** la respuesta es idéntica: quién paga, con qué medio, el reintegro y la parte de cada uno, incluido quién recibe el $1 extra.
11. **Given** una compra de $10.000 entre 3 personas sin reintegro, **Then** las partes son $3.334, $3.333 y $3.333, y el $1 extra va al primero del orden del desempate.
12. **Given** una compra de $41.000 entre 4 personas con un reintegro mostrado de $5.000, **Then** cada uno pone $9.000 y la suma es $36.000.
13. **Given** una compra de $10.001 entre 3 personas en la que paga quien pide, con un reintegro calculado de $2.000,50, **Then** el reintegro mostrado es $2.001, el total a repartir entre 3 es $10.001 − $2.001 = $8.000 y las partes son $2.667, $2.667 y $2.666.
14. **Given** que nadie del grupo tiene un reintegro mostrado de al menos $1, **Then** no hay quien pague recomendado, nunca se nombra un medio, el reintegro es nulo y la división reparte el monto completo.
15. **Given** un contacto sin ningún medio que el motor pueda evaluar, **Then** su resultado es «sin reintegro», no un error del pedido.
16. **Given** promos acumulables que, sumadas, darían un reintegro mayor que el monto, **Then** el total a repartir es $0 y nadie pone un monto negativo.
17. **Given** un grupo de una sola persona, sin quien pide, con más de un «quien pide», con identificadores repetidos o con un monto que no es un entero mayor a cero, **Then** el motor lo rechaza con un error propio, no con una respuesta.
18. **Given** una semana que empezó el mes anterior y una promo con tope semanal, **Then** las compras de esa semana del mes anterior cuentan para el tope.

---

### User Story 2 - Vincular, ver y quitar contactos de verdad (Priority: P2)

Martín abre Perfil → Contactos → Invitar a alguien. La app genera un link y un QR que sirven una vez y vencen en 24 h. Tomás, que está al lado, escanea el QR con la cámara de su teléfono. Otra vez, Martín le manda el link a Sofía por WhatsApp; Sofía lo copia, abre Vuelto, entra a Contactos → «Tengo una invitación» y lo pega. En los dos casos, quien recibe ve que lo invita Martín, qué se comparte y qué se puede deducir, y toca «Aceptar». Desde ese momento se ven en Contactos. Semanas después, Tomás quita a Martín: desaparece para los dos y ninguno puede volver a usar al otro en un grupo.

**Why this priority**: sin vínculos reales no hay a quién sumar a un grupo con sus topes. Es independiente de la recomendación: se prueba armando y quitando vínculos sin calcular nada.

**Independent Test**: con dos cuentas de prueba en una base local, generar una invitación con una, abrirla y aceptarla con la otra, verificar que las dos ven el vínculo, quitarlo desde cualquiera y verificar que desaparece para ambas. Los casos de invitación inválida y de permisos se prueban contra la base, sin la app. El escaneo del QR y el pegado del link se prueban en un dispositivo real.

**Acceptance Scenarios**:

1. **Given** una cuenta con nombre para mostrar, **When** toca «Invitar a alguien», **Then** ve un link `vuelto://i/<token>` y un QR con ese mismo link, con el vencimiento real («Vence en 24 h · sirve una sola vez»). No hay buscador de usuarios.
2. **Given** una invitación sin usar, **When** toca «Generar otro link», **Then** la anterior deja de servir. Una cuenta tiene como mucho una invitación vigente.
3. **Given** una cuenta sin nombre para mostrar, **When** intenta invitar o aceptar, **Then** la app le pide elegir su nombre en Perfil antes de seguir, porque el otro lo va a ver.
4. **Given** un teléfono con Vuelto instalado, **When** escanea el QR con la cámara del sistema, **Then** se abre Aceptar invitación en Vuelto.
5. **Given** Contactos, **When** toca «Tengo una invitación» y pega un link `vuelto://i/<token>` o solo el token, **Then** se abre Aceptar invitación; si lo que pegó no es una invitación, se lo dice ahí mismo sin llamar al servidor.
6. **Given** el link abierto por otra cuenta con perfil guardado, **Then** Aceptar invitación muestra el nombre para mostrar de quien invita, qué se comparte, qué no y qué se puede deducir (incluido que repetir consultas deja deducir más, D9), con «Aceptar» y «Ahora no» del mismo peso.
7. **Given** Aceptar invitación, **When** toca «Aceptar», **Then** el vínculo queda creado para los dos, la invitación queda usada y quien acepta vuelve a Perfil con «Ahora [nombre] es tu contacto».
8. **Given** Aceptar invitación, **When** toca «Ahora no» o sale sin tocar nada, **Then** no se crea ningún vínculo y la invitación sigue sirviendo hasta que venza.
9. **Given** una invitación vencida, ya usada, propia o de alguien que ya es contacto, **Then** la pantalla explica el motivo, solo ofrece «Volver» y no se crea ningún vínculo. **Given** un token que no existe, **Then** dice «Esta invitación no es válida», sin nombre de nadie.
10. **Given** dos personas que aceptan la misma invitación casi al mismo tiempo, **Then** solo una queda vinculada; la otra ve «Esta invitación ya se usó».
11. **Given** que Martín acepta la invitación de Tomás mientras Tomás acepta la de Martín, **Then** queda un solo vínculo; el segundo en llegar ve «Ya son contactos» y su invitación sigue sin usar.
12. **Given** una cuenta nueva, **Then** Contactos muestra «Todavía no tenés contactos» (G-02).
13. **Given** un vínculo creado o quitado desde el otro teléfono, **When** el usuario abre la app, vuelve a ella o entra a Contactos, **Then** la lista refleja el cambio.
14. **Given** un contacto en la lista, **When** lo quita y confirma, **Then** desaparece para los dos y sigue sin estar al reiniciar la app (G-03).
15. **Given** que quitar, generar o aceptar una invitación falla por red o por el servidor, **Then** la pantalla muestra el error con «Reintentar», no se queda cargando y no cambia la lista local (G-05).
16. **Given** que cierra sesión y entra otra cuenta en el mismo teléfono, **Then** no ve los contactos de la cuenta anterior, ni con red ni sin ella.

---

### User Story 3 - La recomendación de grupo con datos reales (Priority: P3)

En la caja del restaurante, Martín elige el comercio, carga $41.000 y toca «¿Pagan entre varios?». Marca a Lucía y Mateo, suma a Sofía, que no tiene cuenta, y toca «Ver quién conviene que pague». Vuelto responde con sus medios, sus compras y el corpus real, y con lo que permiten ver Lucía y Mateo: «Te conviene que pague Lucía con su Galicia Visa crédito · 20% en gastronomía · les devuelven ≈$5.000 · según las compras que registró Lucía», y cada uno pone ≈$9.000.

**Why this priority**: es la historia que ve el usuario, pero depende de US1 (la regla) y de US2 (los vínculos).

**Independent Test**: con una base local, dos contactos vinculados con medios y compras conocidas y un corpus de prueba, pedir la recomendación desde la app (o directo al servidor con la sesión de quien pide) y comparar con lo que da el motor para la misma foto. Verificar que la respuesta, con todos sus textos, no trae ningún dato de los contactos fuera de FR-016.

**Acceptance Scenarios**:

1. **Given** un comercio con rubro, un monto y al menos otra persona marcada, **When** toca «Ver quién conviene que pague», **Then** el resultado usa el perfil, las compras registradas en el servidor y el corpus de quien pide (G-01), no datos de ejemplo.
2. **Given** que conviene que pague un contacto, **Then** la tarjeta dice su nombre, el medio suyo que conviene, qué da la promo (sin nada de su tope), «les devuelven ≈$X» y la base en palabras: «según las compras que registró Lucía», «Lucía no tiene compras registradas con esta promo: sin base», «la promo no informa tope» o «tope por compra».
3. **Given** cualquier resultado, **Then** de un contacto se ve como mucho: su nombre, el medio recomendado (solo si es quien paga), qué da esa promo, el reintegro estimado de esta compra si pagara él (en escalones de $100) y la base en palabras. Nunca su tope, lo que le queda, la cantidad de compras, sus compras, sus otros medios ni por qué no aplica otra promo.
4. **Given** el resultado, **Then** la fila de «Vos» dice el medio propio con su estado y su base, como en la compra individual.
5. **Given** el resultado, **Then** cada fila dice cuánto «pone» esa persona (no «su parte» ni «debe»), la suma de las partes da el monto menos el reintegro mostrado, y un texto aclara que el reintegro le llega a quien paga y que la división no se cobra.
6. **Given** un integrante sin cuenta, **Then** su fila dice «Sin cuenta: no conocemos su tope» y su nombre no sale del teléfono.
7. **Given** dos contactos con el mismo nombre para mostrar, **Then** cada fila corresponde a quien corresponde (las filas se identifican por el contacto, no por el nombre).
8. **Given** el resultado, **Then** dice para qué día se calculó (el de hoy en el servidor); si no coincide con el «hoy» que mostró Armar (por ejemplo, pasada la medianoche), muestra la fecha del servidor.
9. **Given** un comercio sin rubro o escrito a mano, **Then** el paso de compra no ofrece «¿Pagan entre varios?»; y si se llega igual a Armar o al resultado, la pantalla lo explica y ofrece volver al paso de compra, en vez de quedarse cargando (G-04).
10. **Given** el resultado sin un grupo armado, **Then** ofrece volver al paso de compra; no existe un grupo de ejemplo.
11. **Given** que el servidor falla, no responde en 15 s o no hay red, **Then** el resultado muestra el error con «Reintentar» (G-05).
12. **Given** un contacto que dejó de serlo entre que se armó el grupo y se pidió el resultado, **Then** no se calcula nada con sus datos, la pantalla dice que alguien del grupo ya no es contacto, ofrece «Volver a armar» y la lista de contactos se actualiza.
13. **Given** el mismo grupo, el mismo monto y los mismos datos en el servidor, el mismo día, **When** se pide dos veces, **Then** la respuesta es la misma.

### Edge Cases

- **Compras de quien pide que todavía no se subieron** (cola de la spec 010): el servidor no las ve, así que el estimado de «Vos» en el grupo puede diferir del de la pantalla individual. La base en palabras dice en qué compras se apoya; no se mezclan las dos fuentes.
- **Contacto que no confirma una compra que pagó**: su tope no cambia hasta que la confirme (ADR-008 §6, constitución §V). La recomendación siguiente puede sobrestimarlo; se acepta.
- **Promos vencidas que comparten tope con una vigente**: sus compras del período cuentan para el tope compartido, igual que en la compra individual; el motor las recibe para eso y no las recomienda.
- **Medio de pago de un contacto que ya no está en el catálogo**: no se evalúa, igual que en la compra individual (si no le queda ninguno, US1-15).
- **Grupo de más de 12 integrantes** (incluidos quien pide y los sin cuenta): Armar no deja seguir y el servidor lo rechaza.
- **Monto vacío, 0 o no entero**: Armar no deja seguir (comportamiento de hoy) y el servidor lo rechaza.
- **Invitación abierta sin cuenta o sin onboarding**: pasa por el registro y vuelve a Aceptar (comportamiento de hoy, spec 006 US5-5).
- **Borrar la cuenta**: borra sus invitaciones y sus vínculos, y desaparece de la lista de sus contactos.
- **Sin red al abrir Contactos**: se muestra la última lista conocida de esa cuenta con el aviso de sin conexión que ya usa la app; quitar, invitar y aceptar necesitan red.
- **Identificador de contacto inexistente o no vinculado**: el servidor responde exactamente igual en los dos casos, para no revelar si una cuenta existe.

## Requirements *(mandatory)*

### Functional Requirements

**Motor (US1)**

- **FR-001**: El motor MUST ofrecer una función pura que, dada una compra concreta (rubro, canal, comercio y monto entero mayor a cero), la foto de los integrantes del grupo, el corpus de promociones y la hora (`ahora`), devuelva quién conviene que pague, con qué medio, el reintegro mostrado, la base de cada integrante y la parte de cada uno. No lee de la base, no usa la red, no lee el reloj y no usa un modelo de lenguaje.
- **FR-002**: La foto de cada integrante con cuenta MUST tener su identificador, si es quien pide, sus medios de pago y su **consumo de topes**: sus compras del período, cada una reducida a promoción, fecha, monto, descuento obtenido y un identificador opaco que no es el de la base. El período MUST ser desde el inicio del mes o el inicio de la semana de `ahora` (el que sea anterior) hasta el día de `ahora`, inclusive, en hora de Argentina. La foto de un integrante sin cuenta MUST tener solo su posición de carga, como dato propio (no su lugar en la lista).
- **FR-003**: Cada integrante con cuenta MUST evaluarse con las mismas reglas que la compra individual (vigencia, día, medio, categoría, comercio, canal, monto mínimo, jurisdicción, tope consumido, tope compartido y acumulabilidad), con el tope de su dueño. La compra individual y la de grupo MUST calcular el consumo de topes con la misma función.
- **FR-004**: El reintegro mostrado de quien pide MUST ser su reintegro estimado redondeado al peso (los 50 centavos suben). El de un contacto, redondeado al múltiplo de $100 más cercano (los $50 suben) (D9). El criterio MUST ser el mayor reintegro mostrado. Ante un empate gana quien pide; entre los demás, el menor identificador por código de carácter en minúsculas. Solo puede ser quien paga un integrante con reintegro mostrado de al menos $1.
- **FR-005**: El resultado MUST ser idéntico para la misma foto, sin importar el orden en que lleguen los integrantes.
- **FR-006**: La división MUST hacerse en pesos enteros: total = máximo entre 0 y (monto − reintegro mostrado de quien paga, o 0 si nadie paga). Cada integrante pone la parte entera de `total / n`; el resto se reparte de a $1 en el orden del desempate: quien pide, después los contactos por identificador, después los sin cuenta por su posición de carga. La suma de las partes MUST ser exactamente el total.
- **FR-007**: La división MUST tratar igual a un medio de débito y a uno de crédito (D2).
- **FR-008**: La base de cada integrante con cuenta MUST ser una de estas cuatro: con compras, sin compras, la promo no informa tope o tope por compra. Se calcula sobre las compras que consumieron el tope de la promo aplicada en su período (D10). Un integrante sin reintegro no tiene base.
- **FR-009**: Un integrante sin ningún medio evaluable, o cuyo mejor reintegro mostrado es $0, MUST quedar como «sin reintegro», sin medio nombrado, y nunca hacer fallar el pedido.
- **FR-010**: El motor MUST rechazar con un error propio un grupo de menos de dos integrantes, sin quien pide, con más de un «quien pide», con identificadores o posiciones repetidas, con más de 12 integrantes o con un monto que no es un entero mayor a cero.

**Contactos (US2)**

- **FR-011**: Una cuenta con perfil guardado y nombre para mostrar MUST poder generar una invitación de un solo uso que vence a las 24 h. Generar una nueva invalida la anterior sin usar. Se guarda solo una huella del token, nunca el token en claro, ni en la base ni en los registros: el token viaja en el cuerpo de los pedidos, nunca en la dirección.
- **FR-012**: El link MUST ser `vuelto://i/<token>` (en Expo Go, el equivalente que da Expo para el mismo camino), y el QR codifica ese mismo link. Contactos MUST ofrecer «Tengo una invitación» para pegar el link o el token, y lo valida en el teléfono antes de abrir Aceptar.
- **FR-013**: Ver una invitación MUST devolver uno de estos estados: válida, vencida, usada, propia, ya contacto o inexistente. Para todos menos inexistente, también el nombre para mostrar de quien invita y, si es válida, cuándo vence. No devuelve ningún otro dato de quien invita.
- **FR-014**: Aceptar MUST crear el vínculo solo si la invitación es válida, no es propia, no son ya contactos y quien acepta tiene nombre para mostrar; y MUST marcar la invitación como usada en la misma operación. Dos aceptaciones simultáneas de la misma invitación crean un solo vínculo; dos invitaciones cruzadas aceptadas a la vez, también, y la del segundo queda sin usar.
- **FR-015**: El vínculo MUST ser simétrico y único por par de cuentas, sin auto-vínculo. Cualquiera de los dos lo puede quitar, y quitarlo lo borra para ambos. Borrar una cuenta borra sus vínculos e invitaciones.
- **FR-016**: Cada cuenta MUST ver solo sus propios vínculos (con el identificador y el nombre para mostrar del otro) y sus propias invitaciones. Las reglas de acceso de `perfiles`, `medios_de_pago` y `compras` no se abren a otros usuarios (ADR-008 §4).
- **FR-017**: Las funciones que necesitan permisos elevados (ver y aceptar invitaciones, leer datos de contactos) MUST vivir fuera de `public`, fijar su ruta de búsqueda y no ser ejecutables por usuarios sin sesión. En `public` solo hay envoltorios sin permisos elevados. Los usuarios sin sesión MUST NOT tener ningún permiso sobre las tablas nuevas, y las comprobaciones actuales de estructura MUST seguir pasando sin cambios (D6).
- **FR-018**: La lectura de los datos de un contacto MUST exigir la clave de servidor (D8): con la sesión de un usuario vinculado y sin la clave correcta, se rechaza. La clave no está en la app ni en el repositorio.
- **FR-019**: La app MUST traer la lista de contactos del servidor al iniciar sesión, al abrir la app, al volver a primer plano y al entrar a Contactos; una cuenta nueva arranca sin contactos. La última lista conocida se guarda en el teléfono asociada a la cuenta, y se borra al cerrar sesión o al entrar otra cuenta. El grupo en armado nunca se guarda.
- **FR-020**: No MUST existir búsqueda de usuarios por nombre, email ni ningún otro dato (RF-21).

**Recomendación de grupo (US3)**

- **FR-021**: La respuesta al teléfono MUST contener, de cada contacto, solo: su identificador (que quien pide ya mandó), el nombre para mostrar, el medio recomendado y qué da esa promo sin datos de tope (solo si es quien paga), el reintegro mostrado de esta compra si pagara él (o que no tiene) y su base (FR-008). Ningún texto de la respuesta MUST incluir su tope, lo que le queda, la cantidad de compras, sus compras, sus otros medios ni motivos de descarte.
- **FR-022**: De quien pide, la respuesta MUST traer su medio, qué da la promo, su reintegro mostrado y su base con la cantidad de compras y el período, porque son sus datos (como en la compra individual).
- **FR-023**: El cálculo MUST hacerse en el servidor, con la sesión de quien pide (nunca con la llave maestra): leyendo su perfil y sus compras con sus permisos normales, los datos de los contactos con la clave de servidor después de verificar el vínculo con cada uno, y las promociones vigentes del rubro más las que referencian las compras del período de todos los integrantes. Un identificador que no es contacto vinculado MUST rechazar el pedido entero sin devolver datos, con la misma respuesta que un identificador inexistente.
- **FR-024**: El pedido MUST llevar el comercio (con su rubro), el canal, el monto, los identificadores de los contactos y la cantidad de integrantes sin cuenta. No lleva fecha. Los nombres de los integrantes sin cuenta MUST NOT salir del teléfono.
- **FR-025**: La compra del grupo MUST ser de hoy según el reloj del servidor en la zona horaria de Argentina, que entra al motor como `ahora`; la respuesta MUST decir qué día se evaluó.
- **FR-026**: El servidor MUST rechazar el pedido si el monto no es un entero mayor a cero, si el rubro no existe, si hay contactos repetidos, si la cantidad de sin cuenta no es un entero mayor o igual a 0 o si el grupo supera los 12 integrantes.
- **FR-027**: Cada falla MUST tener una respuesta distinguible y una acción en pantalla:

  | Caso | Qué ve el usuario | Acción |
  |---|---|---|
  | Pedido inválido (monto, rubro, tamaño del grupo) | «No pudimos armar este grupo» con el motivo | Volver al paso de compra |
  | Alguien del grupo ya no es contacto (o no existe) | «Alguien del grupo ya no es tu contacto» | «Volver a armar», y se actualiza la lista |
  | Sesión vencida | El aviso de sesión que ya usa la app | Iniciar sesión |
  | Falla del servidor, sin red o más de 15 s sin respuesta | «No pudimos calcularlo» | «Reintentar» |

- **FR-028**: Toda cifra estimada MUST mostrarse con «≈» y con su base en palabras (constitución §V). Las filas dicen cuánto «pone» cada uno; la pantalla aclara que el reintegro le llega a quien paga y que la división no se cobra.
- **FR-029**: El paso de compra MUST NOT ofrecer «¿Pagan entre varios?» si el comercio no tiene rubro. Armar y el resultado no MUST quedarse cargando: terminan en un resultado o en una de las acciones de FR-027. No existe un grupo de ejemplo en el camino real.
- **FR-030**: La app MUST dejar de usar `grupo-simulado.ts`, `datosDeContactos` y los demás datos de ejemplo de grupo e invitaciones; ningún build MUST llevar compras de contactos en el código (G-13).
- **FR-031**: No MUST existir pantalla de carga manual de gastos compartidos (RF-20).

**Privacidad y documentación**

- **FR-032**: `docs/product/privacidad.md` MUST reflejar lo que se guarda (invitaciones, vínculos, la lista de contactos en el teléfono asociada a la cuenta), lo que no (integrantes sin cuenta, el grupo en armado), que las compras reducidas de un contacto se leen en el servidor y no salen de él, y lo que se puede deducir repitiendo consultas (D9).
- **FR-033**: El mismo PR MUST enmendar ADR-008 (§3, §4, §7, §8), ADR-010 (§2, §3), `requisitos.md` (pendientes de RF-19 y RF-20), `pendientes.md`, `01-data-models.md`, la tabla Stack de `CLAUDE.md` y la spec 006 (US5-9: sin grupo de ejemplo con fecha fija).
- **FR-034**: Los registros del servidor MUST NOT incluir medios, compras, topes ni tokens de invitación.

### Key Entities

- **Invitación**: la emite una cuenta. Tiene la huella del token, el vencimiento (24 h) y la fecha de uso (vacía si no se usó). Solo la ve su emisor; como mucho una vigente por cuenta.
- **Vínculo (contacto)**: un par de cuentas, sin orden, con su fecha de creación. Lo ven las dos.
- **Integrante**: quien pide, un contacto vinculado o alguien sin cuenta (solo en el teléfono, con un nombre y una posición de carga).
- **Consumo de topes**: las compras del período de un integrante con cuenta, reducidas a promoción, fecha, monto, descuento y un identificador opaco. Para un contacto vive solo durante el cálculo en el servidor.
- **Foto del grupo**: lo que el motor recibe de cada integrante (FR-002).
- **Recomendación de grupo**: el día evaluado, quién paga, con qué medio, qué da la promo, el reintegro mostrado, la base, la parte de cada uno y una fila por integrante con solo lo que FR-021 y FR-022 permiten.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Con la misma foto de grupo, 100 corridas con los integrantes en orden aleatorio dan la misma respuesta.
- **SC-002**: En todos los casos de prueba de la división, la suma de las partes es exactamente el total de FR-006, ninguna parte es negativa y ninguna difiere de otra en más de $1.
- **SC-003**: En ningún caso de prueba un contacto con el tope agotado de una promo queda recomendado por esa promo.
- **SC-004**: En el 100% de los casos de prueba, pedir datos de alguien que no es contacto vinculado devuelve un rechazo y ningún dato, con la misma respuesta que para un identificador inexistente.
- **SC-005**: Con la sesión de un usuario vinculado y sin la clave de servidor, la lectura de los datos de su contacto se rechaza en el 100% de los casos de prueba.
- **SC-006**: Una invitación vencida, usada, propia, de alguien que ya es contacto o inexistente nunca crea un vínculo; dos aceptaciones simultáneas crean exactamente uno.
- **SC-007**: Después de quitar un contacto, el siguiente pedido de grupo de cualquiera de los dos que lo incluya se rechaza.
- **SC-008**: Para un contacto armado con tope, restante y cantidad de compras conocidos, ninguno de esos valores aparece en ningún lugar de la respuesta de grupo, textos incluidos; tampoco sus medios no recomendados.
- **SC-009**: Ninguna pantalla del flujo queda cargando más de 15 s: siempre termina en un resultado o en un error con una acción.
- **SC-010**: Una persona arma un grupo de 4 y ve quién conviene que pague en menos de 1 minuto desde el paso de compra.

## Assumptions

- Las pantallas de la spec 006 US5 se conservan. Esta spec cambia de dónde salen los datos, los estados de error, el pegado de invitaciones y algunos textos («pone», «el reintegro le llega a quien paga», «no es válida», la base de cuatro casos), no el diseño.
- El onboarding ya pide el nombre para mostrar (spec 012), así que una cuenta sin nombre es un caso de borde (cuentas viejas o nombre borrado). El nombre se elige o se cambia en Perfil.
- El canal (en el local / online) es el que eligió el usuario en el paso de compra.
- La base local de Supabase (Docker) está disponible para las pruebas de la base y de integración.
- El link `vuelto://` lo abre la cámara del sistema desde un QR en un build de desarrollo o de EAS, y debe confirmarse en un dispositivo real. En Expo Go se usa el link que da Expo.
- La clave de servidor se carga a mano una vez en el proyecto alojado (como secreto de la Edge Function y en la base); el paso queda documentado. En local, la siembra de pruebas usa una clave de prueba.
- La demo del pitch necesita dos o tres cuentas reales vinculadas, con compras registradas sobre promos vigentes del corpus que publica la ingesta. Se preparan a mano con la app: no hay promos ni compras de demo sembradas (ADR-011).
- El borrado automático de invitaciones vencidas queda fuera del MVP, igual que el de compras (`privacidad.md`).
- La Edge Function `recomendar` (fuera del camino de la app por ADR-010) no se toca; su forma de juntar datos se puede reusar.
