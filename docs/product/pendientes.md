# Pendientes

- [ ] Confirmar con la cátedra que el problema no cae en exclusiones
- [ ] Resolver tamaño del equipo (4 vs. 6-8 requeridos)
- [ ] Nombre final + dominio + marca
- [x] Rubros y billeteras/cadenas concretas del alcance — ver
      `alcance-mvp.md`
- [ ] Cómo se dispara el momento de uso (notificación / geolocalización)
- [ ] Auto-registro de una semana (cifra en pesos ahorrada)
- [x] Relevar fuentes: HTML vs. SPA/JSON, términos de uso, robots.txt — ver
      `fuentes-promos.md`
- [x] Umbral de validación automática de la ingesta (qué campos son
      obligatorios para publicar sin persona) — resuelto en la issue #33:
      `bancoId`, `categoriaId`, `porcentaje`, `vigencia.desde`,
      `vigencia.hasta` y `tarjetas`. Ver `CAMPOS_OBLIGATORIOS_PROMO` en
      `packages/motor/src/publicable.ts` y
      `../architecture/01-data-models.md`.
- [ ] Distinguir "la promo no tiene tope" de "no se encontró el tope en la
      letra chica": en el contrato de la issue #33 los dos son
      `tope.monto = null`, y el motor (issue #36) deberá tratarlos igual
      (porcentaje sin techo, avisado en el motivo). Si hace falta
      distinguirlos, se suma un campo aparte (ej.
      `tope.sinTope: boolean | null`).
- [ ] Validar rangos antes de publicar (`porcentaje` entre 0 y 100,
      `vigencia.desde ≤ vigencia.hasta`): `esPromocionPublicable` solo
      chequea que los obligatorios no sean `null`. Propuesta: que el esquema
      del extractor (issue #51) exija los rangos.
- [ ] Experimento de precisión del extractor (entregable de research)
- [ ] Proveedor/modelo del extractor, con salida estructurada
- [ ] Dónde corre el cron de ingesta
- [ ] Expo vs. Flutter formalmente (nivel real del equipo en TS/Dart)
- [x] Estrategia de sincronización del corpus al dispositivo — **descartada**
      (13/10/2026): el cálculo de recomendación/topes se movió a una Edge
      Function del backend (issue #43, ADR-001 §Actualización), así que la
      app ya no necesita el corpus de promociones ni las compras del usuario
      sincronizados localmente. La issue #42, que originalmente diseñaba esta
      sincronización, se cerró por eso.
- [x] Retención de registros de compra en Supabase — ver `privacidad.md`:
      90 días desde la fecha de la compra, luego se eliminan. El borrado
      automático queda fuera de alcance del MVP (política declarada, sin job
      de limpieza implementado). Conservar el historial más allá de 90 días
      es una funcionalidad de una versión paga (fuera de alcance del MVP,
      mencionada en el pitch como camino de crecimiento).
- [ ] Probar el extractor contra 15-20 tickets reales
- [x] Política de retención de imágenes de ticket — ver `privacidad.md`
- [ ] Gasto en grupo: promoción de débito, redondeo de la división
- [ ] Formato exacto de requisitos de la cátedra (numeración, si distingue
      funcionales de no funcionales, formato de historia de usuario) — hace
      falta para terminar el override de spec-kit en
      `.specify/templates/overrides/` (ver Paso 5 del runbook de
      `docs/bitacora-prompts.md`). El PDF de la cátedra no está en el repo;
      falta el texto de esa sección o el archivo.
- [x] `/speckit-implement` (de spec-kit) se solapa con la skill `implement`
      (mattpocock) — resuelto: se usa `/speckit-implement` (la skill
      `implement` no está instalada en el proyecto). Ciclo completo en
      `.specify/memory/constitution.md` §Flujo de trabajo.
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
