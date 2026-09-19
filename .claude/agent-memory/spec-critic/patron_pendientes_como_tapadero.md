---
name: patron-pendientes-como-tapadero
description: En Vuelto, docs/product/pendientes.md absorbe decisiones bloqueantes y las hace parecer gestionadas; hay que tratar cada ítem como prerequisito, no como backlog
metadata:
  type: project
---

`docs/product/pendientes.md` y las secciones "Consequences / pendiente" de los
ADRs funcionan como tapadero: decisiones que bloquean la implementación quedan
listadas como checkbox y por eso parecen gestionadas. Ejemplos: "Estrategia de
sincronización del corpus al dispositivo", "Umbral de revisión de la ingesta
asistida", "Política de retención de imágenes de ticket", "Dónde corre el cron
de ingesta".

**Why:** el proyecto está en etapa de research y el equipo prefiere no cerrar
decisiones prematuramente; el costo es que no se distingue un pendiente barato
de uno que impide escribir la primera línea de código.

**How to apply:** al reportar, separá explícitamente "pendiente conocido" de
"pendiente bloqueante", y nombrá qué no se puede implementar hasta resolverlo.
Que esté escrito en pendientes.md NO lo baja de severidad — decilo así en el
reporte para evitar la respuesta "eso ya lo sabemos".
Relacionado: [[patron-motor-consume-datos-inexistentes]].
