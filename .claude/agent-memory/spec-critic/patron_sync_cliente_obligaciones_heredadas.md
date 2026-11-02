---
name: patron-sync-cliente-obligaciones-heredadas
description: Specs de sincronización servidor→store en Vuelto: obligaciones que otra spec delegó y se pierden, datos de ejemplo que sobreviven a la primera carga, reloj de ejemplo usado para pedir datos reales, poda que borra la base del tope
metadata:
  type: project
---

Visto 2026-11-02 en `specs/009-sincronizar-corpus/spec.md` (issue #42), que baja el corpus y las
compras al store de Redux de la spec 008. Hallazgos recurrentes:

1. **Obligación heredada que se pierde**: la 007 cerró su SC-006 con "las transacciones largas
   se resuelven en la issue de sincronización con un margen" (y lo mismo en research.md), y la 009
   no lo menciona. Buscar siempre con grep "se resuelve en la issue de", "lo resuelve" y "es de #N"
   en las specs anteriores y verificar que la spec que las recibe las cubra.
2. **Premisa falsa sobre los fixtures**: la spec dice "las promos de ejemplo vencen en octubre",
   pero `fixtures.ts` las tiene vigentes hasta el 31/12. Con "mezclar por id", las promos de
   ejemplo sobreviven a la primera carga real y se recomiendan como reales. Verificar contra el
   código cada afirmación sobre los datos de ejemplo.
3. **Reloj de ejemplo usado para pedir datos reales**: "el reloj real llega después de la primera
   sincronización", pero esa sincronización calcula su ventana con `sesion.ahora`, que todavía es
   el reloj fijo. Además, `ahora` no se persiste: en un arranque en frío sin señal, ¿qué decide
   el reloj?
4. **Poda o baja que borra la base del tope**: el motor cuenta las compras de los miembros
   vencidos de un grupo compartido (tope.ts) e ignora las compras de promos que no recibe.
   Sacarlos del corpus deja el restante optimista (§V). Es la versión de cliente del ON DELETE de
   [[patron-esquema-rls-borrados-y-sync]].
5. **Paginación de PostgREST**: `max_rows = 1000` recorta sin error. OFFSET con escrituras
   concurrentes pierde filas, `>` solo pierde los empates y la marca convertida con `Date`
   pierde los microsegundos. Pedir cursor `(marca, id)`.
6. **Reemplazar una lista local** ("conservando pendientes") cuando nadie escribe `pendientes`
   todavía (la issue siguiente) borra los datos del usuario en el intervalo. Revisar también el
   merge con una acción despachada durante el fetch, y el cierre de sesión o cambio de cuenta con
   la sincronización en vuelo (el store no tenía el userId).
7. **Persistencia en una sola clave**: el límite de 2 MB por valor se aplica a todo el store; un
   corpus grande arrastra al perfil y a las compras sin subir, y la medición quedó "para #35"
   ([[patron-pendientes-como-tapadero]]).
8. **Criterios que necesitan la base real** (login, siembra, perfil con UUID) sin marcarse como
   bloqueados: "idéntica con y sin señal" se cumple trivialmente con una recomendación vacía.

**Why:** las specs de cliente se escriben sobre el store de la spec anterior y dan por buenos sus
supuestos (fixtures, reloj, `sesionCerrada`) sin releer el código.
**How to apply:** en specs que llenan el store desde Supabase (#42, #44, #41, #45), abrir
fixtures.ts, sesion.ts, persistencia.ts y los slices y contrastar cada afirmación; preguntar qué
pasa en la primera carga, en un arranque en frío sin señal, con un cambio de cuenta durante el
fetch y con datos que se sacan del corpus. Ver también [[patron-mocks-vs-no-calcular-local]].
