# Alcance del MVP

**Dentro:** CABA/AMBA, 1 rubro (supermercado, ver detalle abajo), un solo
flujo optimizado (compra de supermercado), 6 billeteras/bancos, cadenas de
supermercado con sucursales en CABA/AMBA, ingesta asistida con revisión
humana, perfil declarado por el usuario, registro por ticket, gasto en grupo
nivel 0 (ver abajo).

**Fuera:** integración bancaria, lectura de resúmenes, publicación sin
revisión humana, cobertura nacional, app nativa (se usa Expo).

## Rubro, billeteras y cadenas concretas

- **Rubro:** solo supermercado. Es el único flujo optimizado del MVP — no se
  suman combustible, farmacia ni gastronomía/delivery.
- **Billeteras y bancos** (6): Mercado Pago, MODO, Cuenta DNI (Banco
  Provincia), Santander, Galicia, BBVA. MODO agrega el pago interbancario,
  pero el tope de reintegro se controla por banco (ver
  `../architecture/01-data-models.md`), así que Santander, Galicia y BBVA
  entran como fuentes de promoción independientes aunque el pago pase por
  MODO.
- **Cadenas de supermercado:** todas las que tengan sucursales en CABA/AMBA.
  La cobertura la define la zona, no una lista corta de cadenas elegidas a
  mano.
  - Presencia confirmada en CABA/AMBA: Coto, Carrefour (Market / Express /
    Maxi), Jumbo, Disco, Vea, Día, Changomas.
  - Día y Changomas tienen muchas sucursales chicas o dispersas — mayor
    riesgo de que "no todas las sucursales participan" complique el motor
    (ver `../architecture/01-data-models.md`).
  - Pendiente de verificar en el relevamiento de fuentes (`pendientes.md`):
    confirmar sucursales reales en CABA/AMBA antes de sumar cadenas
    regionales como La Anónima al corpus.

## Gasto en grupo (nivel 0, última prioridad del MVP)

Responde "¿quién de nosotros debería pagar hoy?", no "con cuál de mis
tarjetas". El motor evalúa los medios de pago de todo el grupo (declarados
de antemano, sin cuentas ni topes ajenos en nivel 0) y la división se
genera sola a partir del resultado — nunca se carga a mano.

El registro de gastos y saldos es andamiaje mínimo: el producto es la
decisión de quién paga, no la gestión del gasto compartido.
