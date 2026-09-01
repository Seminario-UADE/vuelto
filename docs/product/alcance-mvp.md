# Alcance del MVP

**Dentro:** CABA/AMBA, 1-3 rubros, un solo flujo optimizado (compra de
supermercado), 4-5 billeteras/bancos, comercios acotados, ingesta asistida
con revisión humana, perfil declarado por el usuario, registro por ticket,
gasto en grupo nivel 0 (ver abajo).

**Fuera:** integración bancaria, lectura de resúmenes, publicación sin
revisión humana, cobertura nacional, app nativa (se usa Expo).

## Gasto en grupo (nivel 0, última prioridad del MVP)

Responde "¿quién de nosotros debería pagar hoy?", no "con cuál de mis
tarjetas". El motor evalúa los medios de pago de todo el grupo (declarados
de antemano, sin cuentas ni topes ajenos en nivel 0) y la división se
genera sola a partir del resultado — nunca se carga a mano.

El registro de gastos y saldos es andamiaje mínimo: el producto es la
decisión de quién paga, no la gestión del gasto compartido.
