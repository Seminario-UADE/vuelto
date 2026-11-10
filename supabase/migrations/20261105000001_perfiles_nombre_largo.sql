-- FR-027 (specs/012-flujo-directo, issue #111): el nombre para mostrar va de 1 a 40 caracteres, sin
-- contar los espacios de los costados. La app lo valida al registrarse y en Perfil; la base lo
-- garantiza aunque llegue de otro cliente. `null` sigue valiendo: las cuentas anteriores no lo tienen.
--
-- La tabla y su RLS (solo el dueño lee y escribe su fila) no cambian: son las de
-- 20261101000002_perfiles.sql. El check de «no vacío» de esa migración queda; este suma el máximo.

alter table public.perfiles
  add constraint perfiles_nombre_largo
  check (nombre_para_mostrar is null or char_length(btrim(nombre_para_mostrar)) between 1 and 40);
