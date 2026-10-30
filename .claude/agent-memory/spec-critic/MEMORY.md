# Memory Index — spec-critic (Vuelto)

- [Requisitos y constitución v2](project_docs_sin_requisitos.md) — requisitos.md + constitución v2.0.0; RNF-02 vs. Principio II ya resuelto (texto viejo en ADR-008).
- [El motor consume datos que ningún modelo produce](patron_motor_consume_datos_inexistentes.md) — jurisdicción, sucursal y tope compartido se evalúan pero no están modelados.
- [Pendientes.md como tapadero](patron_pendientes_como_tapadero.md) — decisiones bloqueantes disfrazadas de backlog; no bajarles severidad.
- [Clave de join sin definir](patron_clave_de_join_sin_definir.md) — se persiste perfil que debe matchear contra MODO sin definir clave, cardinalidad ni combinaciones válidas.
- [Checklist autoaprobada](patron_checklist_autoaprobada.md) — los checklists de spec-kit llegan todo en [x]; revisar cada ítem contra el texto real.
- [Features que cruzan datos entre usuarios](patron_propuesta_cruza_datos_entre_usuarios.md) — RLS/RNF-05/privacidad no tienen camino para leer datos ajenos; tope ajeno filtra historial.
- [Mocks vs. "la app no calcula"](patron_mocks_vs_no_calcular_local.md) — specs de UI con datos de ejemplo: estado que no se mueve, contrato inventado, límites de Expo Go.
- [DESIGN.md desactualizado por precedencia](patron_diseno_desactualizado_por_precedencia.md) — la spec "gana" por orden pero DESIGN.md/constitución quedan contradichos.
- [Regla infalsable y aritmética](patron_regla_infalsable_y_aritmetica.md) — lista válida igual al enum, floats con igualdad exacta, orden locale, error sin tipo, estimación sin techo; en la 2da pasada, revisar los huecos que deja cada corrección; en specs que extienden otra, defaults perdidos y SC viejos sin enmendar; hacer la cuenta de los ejemplos del diseño contra el umbral.
- [Capa servidor sobre el motor](patron_capa_servidor_sobre_motor.md) — prefiltro que duplica reglas, test de equivalencia tautológico, errores HTTP sin forma, anon key como sesión.
