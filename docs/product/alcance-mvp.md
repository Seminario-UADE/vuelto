# Alcance del MVP

**Dentro:** CABA/AMBA, 3 rubros de corpus (supermercado, combustible y
restaurantes/gastronomía, ver detalle abajo), un solo flujo optimizado
(compra de supermercado), 6 billeteras/bancos, cadenas de supermercado con
sucursales en CABA/AMBA, ingesta asistida con revisión humana, perfil
declarado por el usuario, registro por ticket, gasto en grupo nivel 0 (ver
abajo).

**Fuera:** integración bancaria, lectura de resúmenes, publicación sin
revisión humana, cobertura nacional, app nativa (se usa Expo).

## Rubro, billeteras y cadenas concretas

- **Rubro:** supermercado, combustible y restaurantes/gastronomía entran al
  corpus de promociones. **Supermercado sigue siendo el único flujo
  optimizado** de compra del MVP — combustible y restaurantes se ingestan y
  quedan disponibles para el control de tope, pero no tienen un flujo de
  compra dedicado todavía.
  - Se verificó (research web, no scraping real todavía) que los 6
    proveedores del alcance publican supermercado, combustible y
    restaurantes/gastronomía como categorías de la misma página o portal de
    beneficios: el buscador de promociones de Galicia filtra por categoría
    incluyendo combustible junto a supermercados; los paquetes Black+ de
    BBVA comparten un mismo tope de reintegro entre supermercado,
    combustible y gastronomía; Santander lista "indumentaria, supermercados,
    farmacias, combustible" en una sola página de beneficios; MODO y Mercado
    Pago publican los tres rubros en el mismo resumen mensual de
    promociones. El costo de ingesta extra de sumar estos dos rubros es
    marginal sobre el de supermercado, no una fuente nueva por rubro.
  - Farmacia queda afuera: no apareció junto a los otros tres con la misma
    consistencia en la búsqueda, y no se investigó a fondo — se puede
    reconsiderar más adelante con el mismo criterio.
  - Sigue pendiente relevar las fuentes reales (HTML vs. SPA/JSON, robots.txt)
    antes de scrapear — esto solo confirma que los rubros están juntos, no
    reemplaza el relevamiento técnico (`pendientes.md`).
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
