# Memory Index — spec-critic (Vuelto)

- [Requisitos ya existen (antes no)](project_docs_sin_requisitos.md) — requisitos.md + constitución existen desde oct-2026; contrastar contra criterios, y RNF-02 vs. constitución II.
- [El motor consume datos que ningún modelo produce](patron_motor_consume_datos_inexistentes.md) — jurisdicción, sucursal y tope compartido se evalúan pero no están modelados.
- [Pendientes.md como tapadero](patron_pendientes_como_tapadero.md) — decisiones bloqueantes disfrazadas de backlog; no bajarles severidad.
- [Clave de join sin definir](patron_clave_de_join_sin_definir.md) — se persiste perfil que debe matchear contra MODO sin definir clave, cardinalidad ni combinaciones válidas.
- [Checklist autoaprobada](patron_checklist_autoaprobada.md) — los checklists de spec-kit llegan todo en [x]; revisar cada ítem contra el texto real.
- [Features que cruzan datos entre usuarios](patron_propuesta_cruza_datos_entre_usuarios.md) — RLS/RNF-05/privacidad no tienen camino para leer datos ajenos; tope ajeno filtra historial.
- [Regla infalsable y aritmética](patron_regla_infalsable_y_aritmetica.md) — lista válida igual al enum, floats con igualdad exacta, orden locale, error sin tipo, estimación sin techo; en la 2da pasada, revisar los huecos que deja cada corrección; en specs que extienden otra, defaults perdidos y SC viejos sin enmendar.
- [Capa servidor sobre el motor](patron_capa_servidor_sobre_motor.md) — prefiltro que duplica reglas, test de equivalencia tautológico, errores HTTP sin forma, anon key como sesión.
