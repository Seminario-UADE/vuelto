# Secretos

Cómo se maneja cada credencial del proyecto: dónde vive, quién la usa y qué
hacer si se filtra. Complementa `04-infrastructure.md` (no lo reemplaza) —
las decisiones de stack y el pendiente del cron siguen viviendo ahí.

## 1. Inventario de secretos

| Secreto | Dónde vive | Quién lo usa | Si se filtra |
|---|---|---|---|
| Supabase anon key | Bundle de la app Expo (pública por diseño, va en el cliente) | La app mobile, para autenticarse contra Supabase | Nada nuevo por sí sola — ya está expuesta a propósito. El límite real lo pone la RLS de cada tabla: si una política está mal escrita, esta key es la que la explota. |
| Supabase service role key | Proceso de ingesta (servidor/script) exclusivamente | El script de ingesta, para escribir en `capturas_crudas` | El peor caso posible: saltea RLS por completo, acceso total de lectura/escritura a toda la base, incluido el consumo de reintegros de cada usuario. Tratarla como llave maestra (ver ADR-003). |
| Gemini API key — ingesta (letra chica) | Script de ingesta (servidor/CI), nunca en el repo | Proceso de extracción de promociones | Consumo de cuota a nombre del proyecto. En el free tier el daño es agotar el rate limit y frenar la ingesta, no un cargo en dinero. |
| Gemini API key — Edge Function del ticket | Secretos de proyecto de Supabase (config de la Edge Function) | La Edge Function que procesa la foto del ticket | Mismo riesgo de cuota que la anterior. Además, si la función no valida Auth de quien la invoca, alguien podría gastarla sin pasar por la app. |
| Credenciales de la cuenta de Supabase (dashboard) | Pendiente — no hay gestor de contraseñas de equipo definido todavía | Quien administra el proyecto: crea tablas, escribe RLS, rota keys | La superficie más grande de todas: control total del proyecto. Con esto se lee/exporta toda la base y se ve (o rota) el resto de las keys de esta tabla. |

## 2. Decisión nueva: la foto del ticket no pasa por Storage

**Decisión propuesta, todavía sin validar por el equipo:** la foto del ticket
se manda directo en el body del request a la Edge Function — no se sube a
Supabase Storage en ningún paso intermedio, ni siquiera temporalmente. La
Edge Function la recibe, la reenvía a Gemini, y la descarta al terminar.

Esto es más estricto que lo que dice el documento de stack original y que
ADR-006 (`docs/decisions/006-registro-de-compras-por-ticket.md`): esos textos
dicen que la imagen "no se persiste" pero no especifican el camino que
recorre antes de llegar a Gemini, y `docs/product/pendientes.md` todavía
tiene abierto el ítem "Política de retención de imágenes de ticket" — un
camino vía Storage-y-borrado después era una opción implícita. Esta decisión
la cierra en el sentido más restrictivo (nunca toca Storage), pero como
afecta cómo se implementa la Edge Function y el cliente, **queda marcada como
propuesta hasta que el equipo la confirme** — en particular quien esté a
cargo del back (ver `docs/product/roles-scrum.md`).

Si se confirma, hay que:
- Actualizar ADR-006 y `docs/product/pendientes.md` (cerrar el ítem de
  retención con esta decisión).
- Confirmar el límite de tamaño de body que acepta una Edge Function de
  Supabase, porque una foto de ticket sin pasar por Storage viaja entera en
  el request.

## 3. Reglas duras

- **Nunca en el cliente:** ninguna de las dos Gemini API key, la service role
  key de Supabase, ni las credenciales de la cuenta de Supabase. La app solo
  conoce la anon key.
- **Puede ir en el cliente:** la Supabase anon key — es pública por diseño,
  respeta RLS.
- **Nunca se commitea:** ningún secreto de la tabla de arriba, en ningún
  archivo versionado (tampoco un `.env` sin gitignorear). Cada uno vive en el
  mecanismo de secretos que le corresponde: variables de entorno del proceso
  de ingesta, secretos de proyecto de Supabase para la Edge Function, y
  secretos de repo de GitHub Actions solo para lo que corresponde a CI (ver
  `04-infrastructure.md`, sección CI).
- **RLS se escribe al crear cada tabla, no después** (ADR-003). No es una
  tarea de hardening posterior — la tabla no se considera terminada sin su
  política.

## 4. Riesgo abierto

La service role key en secretos de repo de GitHub Actions es superficie real
si el cron de ingesta terminara corriendo ahí: un PR desde un fork o un
workflow mal escrito puede exfiltrarla. Esto ya está anotado como pendiente
en `04-infrastructure.md`, sección "Pendiente: dónde corre el cron" — no está
resuelto, depende de si las fuentes bloquean las IPs de datacenter de los
runners. No hay nada nuevo que agregar acá más que remarcarlo: mientras ese
pendiente siga abierto, la service role key no debería vivir en secretos de
este repo.

## 5. Qué hacer si se filtra una clave

**Cualquiera de las dos Gemini API key:**
1. Revocar/regenerar la key en Google AI Studio (o la consola de Google Cloud
   correspondiente).
2. Actualizar el secreto en el lugar donde vivía (script de ingesta o
   secretos de la Edge Function de Supabase).
3. Revisar el log de uso de la key filtrada por consumo anómalo antes de la
   rotación.

**Supabase service role key:**
1. Regenerarla desde el dashboard de Supabase (Settings → API).
2. Actualizarla en el único lugar donde debería vivir: el proceso de
   ingesta.
3. Revisar los logs de la base por lecturas/escrituras fuera de lo esperado
   — esta key saltea RLS, así que cualquier acceso indebido no queda
   filtrado por las políticas.

**Supabase anon key:**
No hace falta rotarla por sí sola — es pública. Si la filtración generó un
problema real, el problema no es la key: es una política de RLS mal escrita.
Auditar y corregir las políticas de las tablas afectadas.

**Credenciales de la cuenta de Supabase:**
1. Cambiar la contraseña de inmediato.
2. Revisar el log de actividad del proyecto: quién entró, qué se cambió.
3. Revocar sesiones activas.
4. Rotar todas las demás keys de este documento — quien tuvo la cuenta pudo
   haberlas visto todas.
5. Activar 2FA si no estaba activo (pendiente confirmar si ya lo está).
