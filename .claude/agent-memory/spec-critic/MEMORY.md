# Memory Index — spec-critic (Vuelto)

- [Docs sin requisitos ni historias](project_docs_sin_requisitos.md) — no existe ninguna historia ni criterio de aceptación en docs/; la ausencia es el hallazgo principal.
- [El motor consume datos que ningún modelo produce](patron_motor_consume_datos_inexistentes.md) — jurisdicción, sucursal y tope compartido se evalúan pero no están modelados.
- [Pendientes.md como tapadero](patron_pendientes_como_tapadero.md) — decisiones bloqueantes disfrazadas de backlog; no bajarles severidad.
- [Clave de join sin definir](patron_clave_de_join_sin_definir.md) — se persiste perfil que debe matchear contra MODO sin definir clave, cardinalidad ni combinaciones válidas.
- [Checklist autoaprobada](patron_checklist_autoaprobada.md) — los checklists de spec-kit llegan todo en [x]; revisar cada ítem contra el texto real.
