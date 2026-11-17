-- Privacidad de tickets en Storage (issue #55, RNF-06).
-- La imagen del ticket no se persiste: tras reiniciar la base con todas las migraciones
-- y la siembra, Storage no tiene buckets ni objetos. Las columnas de imagen y las tablas
-- sin RLS ya las cubre estructura.test.sql.
begin;
select plan(3);

select has_table('storage', 'buckets', 'el esquema storage existe (el reinicio local lo trae)');
select is((select count(*)::int from storage.buckets), 0, 'ninguna migración ni la siembra crea buckets de Storage');
select is((select count(*)::int from storage.objects), 0, 'no hay objetos en Storage (ninguna imagen de ticket guardada)');

select * from finish();
rollback;
