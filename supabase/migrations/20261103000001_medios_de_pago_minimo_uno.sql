-- FR-009 (specs/001-perfil-billeteras): un usuario con cuenta no queda sin medios de pago al
-- editar su perfil. La app ya lo evita, pero mira su copia local; con dos dispositivos o una copia
-- vieja se podría borrar el último. Acá lo garantiza la base.
--
-- Statement-level con tabla de transición: borrar varios medios en un mismo DELETE solo se permite
-- si queda alguno. Si el usuario ya no existe (se borró la cuenta y el borrado baja en cascada)
-- no se exige nada. `security definer` porque el usuario de la app no puede leer `auth.users`.

-- Fuera de `public` (la API no lo expone, y estructura.test.sql prohíbe security definer ahí).
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.exigir_algun_medio_de_pago() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from (select distinct user_id from borrados) b
    where exists (select 1 from auth.users u where u.id = b.user_id)
      and not exists (select 1 from public.medios_de_pago m where m.user_id = b.user_id)
  ) then
    raise exception 'El perfil no puede quedar sin medios de pago'
      using errcode = 'VM001', hint = 'ultimo_medio_de_pago';
  end if;
  return null;
end;
$$;

revoke all on function private.exigir_algun_medio_de_pago() from public;

create trigger medios_de_pago_minimo_uno
  after delete on public.medios_de_pago
  referencing old table as borrados
  for each statement
  execute function private.exigir_algun_medio_de_pago();
