---
name: patron-grupo-servidor-con-jwt-del-usuario
description: Gasto en grupo (spec 013, #54): una RPC que la Edge Function llama con el JWT del usuario también la puede llamar la app; los textos del motor llevan tope y cantidad de compras; el sondeo repetido saca compras ajenas; el empate no tiene unidad
metadata:
  type: project
---

Visto 2026-11-15 en `specs/013-gasto-grupo/spec.md` (#54 + #130). Huecos que la spec no ve:

1. **"Solo la Edge Function la llama" no existe con el JWT del usuario.** La Edge Function corre con el JWT de quien pide (RNF-05). Así que cualquier RPC que pueda llamar por PostgREST, la app (o curl con anon key + JWT) la llama igual. Con D4 (compras reducidas de contactos) más los wrappers invoker en `public` (D6), el cliente lee fecha y monto de las compras de un contacto. El problema ya estaba latente en ADR-008 §4, que devolvía todos los medios. Hay que pedir el camino (función sin wrapper expuesto + conexión directa, o un secreto que solo tenga la Edge Function) y un test de permiso denegado.
2. **Los textos libres del motor filtran.** `motivo` incluye "te quedan ≈$X de tope, según N compras"; `textoPromo` con `sinSaldo` dice que otra promo agotó el tope. Un SC que revisa "el contrato" por nombre de campo no lo ve. Pedir lista blanca de textos o solo datos estructurados, y un test que busque cifras conocidas en todo el JSON.
3. **Sondeo repetido.** Repetir el pedido variando monto, comercio o día deja deducir cada compra ajena (Δ restante / porcentaje) y todos los medios con promo. Eso va más allá de "deducir el tope", que es lo consentido.
4. **Empate sin unidad.** El motor da centavos y la pantalla redondea a pesos (`miles` con Math.round). Si "monto − reintegro" se redondea en vez de redondear antes el reintegro, las cifras que se muestran no suman.
5. **Base de un contacto como booleano**: no alcanza para "sin tope informado" ni para "por compra". Además, "tiene compras" puede querer decir cualquier compra (ADR-008) o compras sobre ese saldo (§V).
6. **"Compra de hoy" con el reloj del servidor**: rompe la entrada a Armar con un ejemplo de fecha fija y deja que la app y el servidor no coincidan a medianoche.

**Why:** las specs multiusuario de Vuelto confían en "corre en el servidor" como frontera de privacidad, pero la credencial es la del usuario.
**How to apply:** en toda feature con Edge Function y datos ajenos (#54, #56, ticket), preguntar qué puede llamar la app con el mismo JWT, qué strings del motor viajan y qué se deduce repitiendo el pedido. Relacionado: [[patron-propuesta-cruza-datos-entre-usuarios]], [[patron-capa-servidor-sobre-motor]], [[patron-regla-infalsable-y-aritmetica]].
