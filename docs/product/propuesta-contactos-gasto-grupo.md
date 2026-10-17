# Propuesta (borrador): contactos vinculados para gasto en grupo

> Estado: **resuelta en ADR-008** (15/10/2026). Este documento queda como
> registro del pedido original y de la auditoría; las decisiones vigentes
> están en el ADR, `requisitos.md` (RF-19 a RF-22) y `privacidad.md`.

## Input del usuario (textual)

> Personas para gastos compartidos: tendríamos que agregar a las personas
> para que queden como contactos directamente guardados en nuestro perfil,
> para que cuando haya un gasto en grupo sea más fácil localizarlos. A los
> nuevos contactos no los vamos a buscar por un buscador por perfil
> corriente, sino con un QR o link para "agregar amigo/contacto" en el
> perfil, y que así se vinculen nuestras cuentas. Al momento de hacer un
> gasto en grupo, seleccionamos al contacto guardado y hace un get de sus
> medios de pago para compararlos con los nuestros junto a los topes de
> reintegro, así tenemos bien hecha la decisión de con qué pagar.

## Qué decisión resuelve (Principio I)

"¿Quién de nosotros paga esta compra, y con qué medio?" — igual que el
nivel 0, pero sin que cada integrante tenga que re-declarar sus medios en
cada grupo, y teniendo en cuenta cuánto tope le queda a cada uno.

## Cambio respecto del estado actual

| | Nivel 0 (hoy) | Propuesta |
|---|---|---|
| Integrantes | Declarados a mano, sin cuenta | Contactos con cuenta vinculada |
| Medios de pago ajenos | Declarados por quien arma el grupo | Leídos del perfil del contacto |
| Topes ajenos | No se usan (criterio RF-19) | Se usan |
| Descubrimiento | — | QR o link de invitación desde el perfil; sin buscador |

## Historias de usuario

### HU-1 — Vincular un contacto por QR o link

Como usuario, desde mi perfil genero un QR o un link de "agregar
contacto". Otra persona con cuenta lo escanea/abre y nuestras cuentas
quedan vinculadas como contactos.

### HU-2 — Ver y quitar contactos

Como usuario, veo mi lista de contactos vinculados y puedo quitar uno.

### HU-3 — Gasto en grupo con contactos

Como usuario, al cargar una compra en grupo (comercio + monto) selecciono
uno o más contactos. El sistema obtiene sus medios de pago y sus topes de
reintegro restantes, los compara con los míos y recomienda quién paga y con
qué medio.

## Requisitos funcionales (borrador)

- **FR-001**: El perfil MUST ofrecer un QR y un link de invitación para
  vincular contactos.
- **FR-002**: El sistema MUST NOT ofrecer búsqueda de usuarios por nombre,
  email ni ningún otro dato de perfil.
- **FR-003**: Al abrir el link o escanear el QR, las dos cuentas MUST quedar
  vinculadas como contactos.
- **FR-004**: El usuario MUST poder ver y eliminar sus contactos.
- **FR-005**: En un gasto en grupo, el usuario MUST poder seleccionar
  contactos vinculados como integrantes.
- **FR-006**: El sistema MUST obtener los medios de pago y topes restantes
  de cada contacto seleccionado y evaluarlos junto con los del usuario.
- **FR-007**: El sistema MUST recomendar quién paga y con qué medio.

## Entidades

- **Contacto**: vínculo entre dos cuentas.
- **Invitación**: QR / link que crea el vínculo.

## Preguntas abiertas que la propuesta no responde

Salen de la auditoría (spec-critic + rules-guardian, 15/10/2026).

1. **Alcance**: ¿entra al MVP o es nivel 1 posterior? Hoy RF-19,
   `alcance-mvp.md` y `guion.md` lo ubican después del MVP. Si entra, hace
   falta un ADR y actualizar esos tres documentos.
2. **Lectura de datos ajenos**: ninguna policy de RLS expone `perfil` ni
   `compra` de otro usuario. La Edge Function del motor, con el JWT del
   usuario (no la service role), llama a una función `security definer`
   que verifica el vínculo y devuelve solo medios + tope agregado.
3. **Consentimiento**: ¿vincularse autoriza a compartir topes, o es un
   permiso aparte y revocable? Actualizar `privacidad.md` antes de
   especificar.
4. **Qué ve cada uno**: ¿el usuario ve el tope del contacto en pesos, o solo
   "a Ana le alcanza / no le alcanza"? Mostrar la base ("según N compras")
   filtra metadata ajena.
5. **Tope ajeno sin base** (contacto sin compras registradas): ¿desconocido,
   disponible o excluido?
6. **Registro de la compra cuando paga el contacto**: quién confirma y en
   qué tope impacta (RF-11). Sin esto, los topes del contacto quedan
   desactualizados.
7. **Invitación**: un solo uso, expiración, paso de aceptación,
   auto-vinculación, vínculo ya existente, quien abre no tiene cuenta.
8. **Quitar contacto**: ¿rompe el vínculo para los dos y revoca el acceso
   al instante?
9. **Integrantes sin cuenta** (soportados por el nivel 0): ¿grupos mixtos?
10. **Función objetivo y desempate** determinísticos para "quién paga";
    snapshot de entradas para reproducir una recomendación.
11. **RF-20 (división)**: sigue en alcance; `pendientes.md` tiene abiertos
    débito y redondeo.
12. **Pago dividido** entre dos personas para aprovechar dos topes: ¿se
    recomienda?

Prerrequisito independiente: la constitución (Principio II) dice que el
motor corre en el dispositivo y RNF-02 / ADR-001 §Actualización dicen que
corre solo en la Edge Function. `/speckit-plan` va a fallar hasta enmendarla.
