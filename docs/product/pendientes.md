# Pendientes

> Revisado el **17/11/2026** (issue #132) contra `main`. Ver el estado general
> en `estado.md`. «Sin verificar» = no se puede comprobar desde el repo.

## Con la cátedra y el equipo

- [ ] Confirmar con la cátedra que el problema no cae en exclusiones (sin
      verificar: no hay respuesta registrada en el repo)
- [ ] Resolver tamaño del equipo (4 vs. 6-8 requeridos)
- [ ] Nombre final + dominio + marca (INPI), ver `marca.md`
- [ ] Formato exacto de requisitos de la cátedra (numeración, si distingue
      funcionales de no funcionales, formato de historia de usuario). El PDF
      de la cátedra no está en el repo. Hacía falta para el override de
      spec-kit en `.specify/templates/overrides/`, que hoy no existe: si el
      equipo ya no lo va a hacer, sacar este ítem.
- [x] Rubros y billeteras/cadenas concretas del alcance, ver `alcance-mvp.md`

## Producto

- [ ] Cómo se dispara el momento de uso (notificación / geolocalización). Sin
      decisión registrada: hoy no se dispara nada, el usuario abre la app (no
      hay `expo-notifications` ni `expo-location` en `apps/mobile`).
- [ ] Auto-registro de una semana (cifra en pesos ahorrada). Sin verificar si
      se hizo.
- [x] Gasto en grupo: promoción de débito y redondeo de la división. Resuelto
      por el PO el 15/11/2026 (issue #54, spec 016): la división descuenta el
      reintegro igual para débito y crédito, y el reintegro le llega a quien
      paga; se divide en pesos enteros y el resto va de a $1 en el orden del
      desempate. Ver ADR-008 §Actualización.
- [x] Retención de registros de compra en Supabase: 90 días desde la fecha de
      la compra (`privacidad.md`). El borrado automático queda fuera de
      alcance del MVP: es una política declarada, sin job de limpieza.
- [x] Política de retención de imágenes de ticket, ver `privacidad.md`

## Ingesta y extractores

- [x] Relevar fuentes: HTML vs. SPA/JSON, términos de uso, robots.txt, ver
      `fuentes-promos.md`
- [x] Umbral de validación automática de la ingesta (qué campos son
      obligatorios para publicar sin persona), resuelto en la issue #33:
      `bancoId`, `categoriaId`, `porcentaje`, `vigencia.desde`,
      `vigencia.hasta` y `tarjetas`. Ver `CAMPOS_OBLIGATORIOS_PROMO` en
      `packages/motor/src/publicable.ts` y `../architecture/01-data-models.md`.
- [x] Validar rangos antes de publicar (`porcentaje` entre 0 y 100,
      `vigencia.desde ≤ vigencia.hasta`): los chequea `ingesta/src/corpus/validar.ts`
      (`porcentaje`, `vigencia-orden`). `esPromocionPublicable` del motor sigue
      mirando solo los obligatorios.
- [x] Dónde corre el cron de ingesta: GitHub Actions, una vez por día
      (`.github/workflows/ingesta.yml`, ADR-011, 03/11/2026)
- [x] Proveedor/modelo del extractor, con salida estructurada: ticket → Groq
      (`qwen/qwen3.8-27b`, `strict`), letra chica → Gemini (ADR-012,
      PR #126). ADR-012 sigue figurando «propuesto»: falta pasarlo a
      «aceptado».
- [x] Reconciliar la lista de cadenas de supermercado del alcance contra las
      que tienen promoción vigente en MODO: hecho con el relevamiento del
      03/11/2026 (issue #35), ver `alcance-mvp.md` §Cadenas y
      `corpus-semilla.md`. Carrefour dio 0 ese día.
- [x] Confirmar que MODO publica restaurantes/gastronomía y que las páginas de
      supermercado listan también combustible y farmacias: sí, ver
      `alcance-mvp.md` (la primera pasada había concluido lo contrario por
      consultar la API con el slug en vez del id numérico de categoría).
- [ ] Distinguir «la promo no tiene tope» de «no se encontró el tope en la
      letra chica»: hoy los dos son `tope.monto = null` y el motor los trata
      igual (porcentaje sin techo, avisado en el motivo). Si hace falta
      distinguirlos, se suma un campo aparte (ej. `tope.sinTope: boolean | null`);
      `Tope` en `packages/motor/src/tipos.ts` no lo tiene. Depende de #51.
- [ ] Experimento de precisión del extractor (entregable de research): #53,
      que hay que redefinir porque ya no hay corpus revisado a mano contra el
      cual medir (ADR-011).
- [ ] Probar el extractor de tickets contra 15-20 tickets reales (#10)
- [x] Contrato con la ingesta (#35, #50, #51): cada lote de escrituras de
      `promociones` se confirma en menos de 5 minutos (la app relee con 10 de
      margen, `04-infrastructure.md`). La ingesta escribe en lotes de 50 filas
      (`TAMANO_DE_LOTE` en `ingesta/src/corpus/publicar.ts`); el tiempo real
      por lote no está medido.

## App y sincronización

- [x] Expo vs. Flutter: Expo (ADR-002), y la app ya está hecha en Expo
- [x] Estrategia de sincronización del corpus al dispositivo (issue #42,
      spec 009): primera sincronización con todo lo del período, después
      incremental por `actualizada_en` con un margen de 10 minutos, al abrir y
      al volver a primer plano. Probada en un Android real con el corpus de la
      ingesta, también en modo avión (issue #43, 15/11/2026).
- [x] Sincronizar el perfil (medios de pago y comercios) desde `medios_de_pago`:
      hecho en #41 (PR #100, `store/perfil-remoto.ts`)
- [ ] Medir el tamaño real del corpus vigente de CABA/AMBA y confirmar dónde
      persistirlo. Decisión provisoria: AsyncStorage en `vuelto.corpus.v1`. Ya
      se puede medir (la ingesta publica): `npm run medir:corpus -w
      @vuelto/mobile`. La proyección con promos de ejemplo (2.000 promos ≈
      880 KB) está en `docs/architecture/03-frontend.md`. Verificar además el
      límite de ~2 MB por valor de AsyncStorage en un Android real.
- [ ] Verificar que Metro resuelve `@vuelto/motor` (paquete compilado a
      `dist/`) en Expo Go, en la web y en el APK de EAS. Web y Expo Go andan
      (la web se exporta en `deploy-web.yml`; la prueba de la #43 fue en Expo
      Go). Falta el APK de EAS (#56): sin verificar.

## Plataforma

- [ ] Que corra el chequeo de migraciones: `migraciones.yml` falla porque falta
      el secret `SUPABASE_DB_URL` (ADR-013), y de paso confirmar a mano con
      `supabase migration list --linked` que la base alojada tiene las 12
      migraciones. Sin verificar.
- [ ] Revisar por qué la ingesta no tiene corridas programadas el 16 y 17/11
      (la última fue el 15/11); sin verificar el motivo.
