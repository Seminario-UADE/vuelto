# Quickstart: validar el esquema

**Requisitos**: Docker en marcha y la Supabase CLI (≥ 2.x). Desde la raíz del repo.

## 1. Levantar la base local

```bash
supabase start -x studio,imgproxy,mailpit,realtime,storage-api,edge-runtime,logflare,vector,supavisor
```

(Esos servicios no se usan en este esquema; es lo mismo que corre el CI. Si otro proyecto de Supabase ya ocupa los puertos 54321-54329, frenalo o cambiá los puertos de `supabase/config.toml` solo en tu copia local.)

## 2. Reiniciar desde cero (dos veces)

```bash
supabase db reset
supabase db reset
```

Esperado: ambas terminan sin errores. `select count(*) from categorias` devuelve 13 y `bancos` contiene a Galicia.

## 3. Correr la suite de RLS

```bash
supabase test db
```

Esperado: todos los tests pasan. Cubren los escenarios de las historias 1 a 4 de la [spec](spec.md): aislamiento entre A y B, catálogos y promociones de solo lectura, `capturas_crudas` invisible, rol anónimo sin acceso, cambio de dueño, medio de pago ajeno, borrado de cuenta, constraints del tipo `Promocion` y marca `actualizada_en`.

## 4. Revisión rápida a mano (opcional)

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select tablename, rowsecurity from pg_tables where schemaname = 'public'"
```

Esperado: `rowsecurity = t` en todas las tablas.

## 5. Parar

```bash
supabase stop
```
