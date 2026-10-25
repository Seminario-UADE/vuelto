---
name: patron-capa-servidor-sobre-motor
description: Specs de Edge Function que envuelven al motor — prefiltro SQL que duplica reglas del motor, test de equivalencia tautológico, errores HTTP sin contrato, anon key como "sesión"
metadata:
  type: project
---

Visto en specs/003-recomendar-pantalla (issue #43, 2026-10-24):

1. **Prefiltro que duplica reglas**: el servidor filtra promos "del rubro y vigentes hoy" antes del motor, mientras dice "no duplica ninguna regla del motor". Las causas `categoria`/`vigencia` nunca se disparan, y "vigente hoy" puede leerse incluyendo el día de semana (borra el descarte `dia` de los escenarios). Fecha del SQL (UTC/`current_date`) puede diferir de `fechaArgentina`.
2. **Test de equivalencia tautológico**: "respuesta idéntica a llamar recomendar() con los mismos datos, con repos falsos" no prueba la selección de datos (rubro, mes, zona horaria, RLS), que es la única lógica nueva.
3. **Errores sin contrato**: "error distinguible", "indicando qué campo falló", "sesión vencida" sin status HTTP ni forma del cuerpo; la app no puede ramificar.
4. **"Sesión válida" ambigua**: el gateway de Supabase acepta el JWT de la anon key; hay que exigir usuario (`auth.getUser`) no solo JWT.
5. **Ids sin nombre**: la respuesta trae ids y la app resuelve nombres con lecturas aparte → falta el caso de id desconocido (medio agregado en otro dispositivo) y de falla de esa lectura.

**Why:** el motor ya está testeado; los bugs de las features que lo consumen están en la capa que arma sus argumentos.
**How to apply:** en specs que llaman al motor (#38, #44, #46), revisar quién filtra qué antes del motor, qué cubre el test, y el contrato de errores. Ver [[patron-regla-infalsable-y-aritmetica]].
