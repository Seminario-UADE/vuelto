# Pendientes

- [ ] Confirmar con la cátedra que el problema no cae en exclusiones
- [ ] Resolver tamaño del equipo (5 vs. 6-8 requeridos)
- [ ] Nombre final + dominio + marca
- [x] Rubros y billeteras/cadenas concretas del alcance — ver
      `alcance-mvp.md`
- [ ] Cómo se dispara el momento de uso (notificación / geolocalización)
- [ ] Auto-registro de una semana (cifra en pesos ahorrada)
- [x] Relevar fuentes: HTML vs. SPA/JSON, términos de uso, robots.txt — ver
      `fuentes-promos.md`
- [ ] Umbral de revisión de la ingesta asistida
- [ ] Experimento de precisión del extractor (entregable de research)
- [ ] Proveedor/modelo del extractor, con salida estructurada
- [ ] Dónde corre el cron de ingesta
- [ ] Expo vs. Flutter formalmente (nivel real del equipo en TS/Dart)
- [ ] Estrategia de sincronización del corpus al dispositivo
- [ ] Probar el extractor contra 15-20 tickets reales
- [x] Política de retención de imágenes de ticket — ver `privacidad.md`
- [ ] Gasto en grupo: promoción de débito, redondeo de la división
- [ ] Formato exacto de requisitos de la cátedra (numeración, si distingue
      funcionales de no funcionales, formato de historia de usuario) — hace
      falta para terminar el override de spec-kit en
      `.specify/templates/overrides/` (ver Paso 5 del runbook de
      `docs/bitacora-prompts.md`). El PDF de la cátedra no está en el repo;
      falta el texto de esa sección o el archivo.
- [ ] `/speckit-implement` (de spec-kit) se solapa con la skill `implement`
      (mattpocock) que ya está en el ciclo — mismo tipo de ambigüedad que se
      resolvió en `docs/decisions/007-speckit-sobre-to-spec.md`, todavía sin
      decidir cuál de las dos usar.
- [x] Verificar si las páginas de bancos/billeteras que se van a scrapear
      para supermercado listan también restaurantes y/o combustible en la
      misma página/estructura (comentario de Joaconz en PR #13) — confirmado
      por research web para los 6 proveedores del alcance, ver
      `alcance-mvp.md`.
      **Revisado de nuevo con el alcance ya acotado a MODO**: se había
      concluido mal en el camino (ver ítem siguiente) que restaurantes no
      existía en MODO; corregido — sí existe, y con más promos que ningún
      otro rubro. Farmacias también se sumó al alcance, con evidencia real.
- [x] Confirmar si MODO publica promociones de restaurantes/gastronomía —
      **sí, confirmado**: 646 promos activas bajo la categoría "Gastronomía"
      de la API de MODO (incluye Kansas), ver `alcance-mvp.md` y
      `fuentes-promos.md`. La primera pasada de este research había
      concluido lo contrario por un error al consultar la API (se probó con
      el slug de texto en vez del id numérico de categoría).
- [ ] Reconciliar la lista de cadenas de supermercado del alcance contra las
      que efectivamente tienen promoción vigente en MODO (`alcance-mvp.md`)
      — la lista anterior salía de presencia genérica en CABA/AMBA, no de
      las promos reales de la única fuente que va a ingestar el MVP. Un
      primer intento vía `search_text` por cadena dio resultados poco
      confiables (ver `alcance-mvp.md`); falta paginar la categoría
      "Mercados" completa y revisar los comercios uno por uno.
