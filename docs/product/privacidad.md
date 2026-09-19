# Privacidad y retención de datos

Resuelve el pendiente de retención de imágenes de ticket dejado abierto en
ADR-006 y desbloquea RNF-06 (`requisitos.md`). Cubre el MVP del Seminario:
datos reales de usuarios de prueba, no un entorno de producción comercial.

## Qué datos se recopilan

| Dato | Origen | ¿Se persiste? |
|---|---|---|
| Medios de pago declarados (billeteras, bancos, tarjetas) | Perfil (RF-01) | Sí |
| Comercios habituales | Perfil (RF-02) | Sí, opcional |
| Imagen del ticket | Cámara del usuario | **No** |
| Texto extraído del ticket (monto, comercio, medio de pago, descuento) | Extractor (ADR-006) | Sí, junto al registro de compra |
| Registro de compra confirmado | Confirmación del usuario (RF-09) | Sí |

## Imágenes de ticket: retención durante el procesamiento

La imagen viaja del celular a la Edge Function de Supabase y de ahí a la API
de Gemini, dentro del mismo request (`04-infrastructure.md`). No se escribe
a disco ni a Supabase Storage en ningún punto del camino: vive en memoria
durante ese request y se descarta al recibir la respuesta del extractor, se
haya podido extraer algo o no.

Si la extracción falla, no queda la imagen guardada para reintentar: el
usuario vuelve a fotografiar el ticket.

## Qué se persiste y por cuánto tiempo

- **Texto extraído del ticket**: se guarda junto al registro de compra
  mientras la cuenta exista, porque es la base de los topes estimados
  (ADR-006, RF-07) — sin este historial no se puede mostrar de dónde sale
  un "≈$18.000". Se borra si el usuario borra su cuenta.
- **Perfil** (medios de pago, comercios): se guarda mientras la cuenta
  exista.
- **Aislamiento entre usuarios**: cada tabla lleva row-level security desde
  su creación (`CLAUDE.md`, RNF-07); un usuario no puede leer el registro de
  otro.

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

## Fuera de alcance de este documento

Gasto en grupo (RF-19/RF-20) puede exponer datos de terceros que no son
usuarios de la app (integrantes del grupo sin cuenta propia). Esta política
se actualiza si esa funcionalidad avanza más allá del nivel 0.

---

Fuentes: ADR-006, `CLAUDE.md`, `requisitos.md` (RNF-06, RNF-07),
`architecture/04-infrastructure.md`.
