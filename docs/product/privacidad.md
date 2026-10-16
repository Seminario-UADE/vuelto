# Privacidad y retención de datos

Resuelve el pendiente de retención de imágenes de ticket dejado abierto en
ADR-006 y desbloquea RNF-06 (`requisitos.md`), y fija la política de
retención del registro de compras (`pendientes.md`). Cubre el MVP del
Seminario: datos reales de usuarios de prueba, no un entorno de producción
comercial.

## Qué datos se recopilan

| Dato | Origen | ¿Se persiste? |
|---|---|---|
| Medios de pago declarados (billeteras, bancos, tarjetas) | Perfil (RF-01) | Sí |
| Comercios habituales | Perfil (RF-02) | Sí, opcional |
| Imagen del ticket | Cámara del usuario | **No** |
| Texto extraído del ticket: monto, comercio, medio de pago, promoción aplicada, descuento obtenido, reintegro esperado, fecha estimada de acreditación, origen del registro (`ticket` / `excepción` / `manual`) | Extractor (ADR-006), `01-data-models.md` §Compra | Sí, 90 días (ver abajo) |
| Registro de compra confirmado | Confirmación del usuario (RF-09) | Sí, 90 días (ver abajo) |
| Vínculo con un contacto (las dos cuentas y la fecha) | Aceptación de una invitación (RF-21) | Sí, mientras ninguno de los dos lo quite ni borre su cuenta |
| Nombre para mostrar | Perfil (RF-21) | Sí, mientras la cuenta exista. Lo ven los contactos vinculados y quien recibe una invitación |
| Invitación de contacto (hash del token, emisor, vencimiento, fecha de uso) | Perfil (RF-21) | Sí, mientras exista la cuenta del emisor. Deja de servir al usarse o a las 24 h; el borrado automático de las vencidas queda fuera de alcance del MVP, igual que el de compras |
| Integrantes declarados a mano en un grupo (nombre y medios de pago de alguien sin cuenta) | Quien arma el grupo (RF-19) | Sí, mientras exista el grupo |

## Imágenes de ticket: retención durante el procesamiento

La imagen viaja del celular a la Edge Function de Supabase y de ahí a la API
de Gemini, dentro del mismo request (`04-infrastructure.md`). No se escribe
a disco ni a Supabase Storage en ningún punto del camino: vive en memoria
durante ese request y se descarta al recibir la respuesta del extractor, se
haya podido extraer algo o no.

Si la extracción falla, no queda la imagen guardada para reintentar: el
usuario vuelve a fotografiar el ticket.

## Qué se persiste y por cuánto tiempo

- **Registro de compra** (texto extraído del ticket + el resto de los
  campos de `Compra`): se retiene en Supabase **90 días desde la fecha de
  la compra**, porque es la base de los topes estimados (ADR-006, RF-07) —
  sin este historial no se puede mostrar de dónde sale un "≈$18.000".
  Pasados los 90 días, el registro se elimina.
  - El **borrado automático queda fuera de alcance del MVP**: es una
    política declarada, no un proceso corriendo — no hay job de limpieza
    implementado.
  - Conservar el historial más allá de 90 días es una funcionalidad de una
    **versión paga** (fuera de alcance del MVP, mencionada en el pitch como
    camino de crecimiento) que retiene las capturas para siempre.
  - Esto es independiente de cuánto historial sincroniza el celular para
    calcular: el motor solo necesita la ventana del mes en curso (≤31 días,
    issue #42); los 90 días son la política de retención del lado del
    servidor, no lo que se descarga al dispositivo.
- **Perfil** (medios de pago, comercios): se guarda mientras la cuenta
  exista.
- **Aislamiento entre usuarios**: cada tabla lleva row-level security desde
  su creación (`CLAUDE.md`, RNF-07); un usuario no puede leer el registro de
  otro. La única excepción es la de contactos vinculados (abajo), y no pasa
  por RLS sino por una función del servidor.

## Datos compartidos entre contactos (gasto en grupo)

Detalle y razonamiento en ADR-008.

- **Consentimiento.** Dos cuentas comparten datos solo si una invitó y la
  otra aceptó en una pantalla que dice qué se comparte. Abrir un link o
  escanear un QR no alcanza. No hay buscador de usuarios.
- **Qué se comparte.** Nombre para mostrar, medios de pago declarados,
  tope consumido agregado por promoción y cantidad de compras registradas
  (para la base del estimado). Nunca compras individuales (monto, comercio,
  fecha), comercios habituales ni email.
- **Qué ve el otro.** Además del nombre, solo la recomendación: qué medio
  del contacto conviene usar y el reintegro estimado de esa compra, con su
  base dicha en palabras ("según las compras que registró Ana" / "sin
  base"). No ve el tope ni el número de compras, pero **puede inferir**
  parte del tope cuando el estimado sale recortado, y si el contacto
  registró alguna compra o ninguna. La pantalla de aceptación lo advierte y
  eso forma parte del consentimiento.
- **Cómo se accede.** Las policies de `perfil`, `compra` e `invitacion`
  siguen siendo de lectura exclusiva del dueño. Las Edge Functions corren
  con el JWT del usuario (nunca con la service role key) y pasan por
  funciones SQL que verifican el vínculo (para leer datos del contacto) o
  la invitación (para aceptarla).
- **Revocación.** Cualquiera de los dos puede quitar el contacto; el
  vínculo se rompe para ambos y el acceso se corta al instante. Borrar la
  cuenta borra sus vínculos.
- **Integrantes sin cuenta.** Quien arma un grupo puede declarar a mano a
  alguien que no usa la app (nombre y medios de pago). Es un dato que carga
  un tercero: se usa solo dentro de ese grupo y se borra con él.

## Terceros

- **Google (Gemini API)**: procesa el texto de tickets y de letra chica de
  promociones. Es un proveedor de servicio, no un tercero al que se le
  entregan datos para otro fin.
- **Supabase**: aloja la base de datos y la autenticación. Mismo criterio:
  proveedor de infraestructura.

No se vende ni se comparte información fuera de estos dos proveedores, y
solo con el propósito de operar la app.

## Derechos del usuario

El MVP no tiene pantalla dedicada a esto todavía; se resuelve manualmente,
a través de quien administre el proyecto:

- Acceso a los datos guardados.
- Corrección de un dato mal extraído.
- Baja de cuenta y borrado de todos sus registros.

---

Fuentes: ADR-006, ADR-008, `CLAUDE.md`, `requisitos.md` (RNF-06, RNF-07,
RF-19, RF-21, RF-22),
`architecture/04-infrastructure.md`, `architecture/01-data-models.md`
(§Compra, §Perfil de usuario).
