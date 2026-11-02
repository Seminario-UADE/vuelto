# Contrato: consultas a PostgREST

Verificadas el 02/11/2026 contra un Supabase local con las migraciones del repo y la sesión de un usuario `authenticated`
(ver `research.md` R1). Con supabase-js los filtros se arman con `.or()`/`.and()`, `.order()`, `.limit()`; el `+` del
offset de los timestamps lo codifica `URLSearchParams` como `%2B`.

## Promociones (primera sincronización, `marca = null`)

```text
GET /rest/v1/promociones
  ?select=<columnas>
  &order=actualizada_en.asc,id.asc
  &limit=500
  &and=(or(jurisdiccion.is.null,jurisdiccion.neq.otra_provincia),
        vigencia_hasta.gte.<inicioDelPeriodo>,
        or(actualizada_en.gt.<T>,and(actualizada_en.eq.<T>,id.gt.<I>)))   # el cursor, desde la 2.ª página
```

## Promociones (incremental, `marca` no nula)

Igual, sin `vigencia_hasta.gte` (FR-004) y con `actualizada_en.gt.<marca − 10 min>` como piso de la primera página. El
cursor posterior reemplaza a ese piso.

## Ids del período (reconciliación, FR-009)

```text
GET /rest/v1/promociones?select=id&order=id.asc&limit=500
  &and=(or(jurisdiccion.is.null,jurisdiccion.neq.otra_provincia),vigencia_hasta.gte.<inicioDelPeriodo>,id.gt.<I>)
```

## Compras

```text
GET /rest/v1/compras?select=<columnas>&order=creada_en.asc,id.asc&limit=500
  &fecha=gte.<inicioDelPeriodo>
  &or=(creada_en.gt.<T>,and(creada_en.eq.<T>,id.gt.<I>))      # el cursor, desde la 2.ª página
```

El RLS filtra por dueño (`compras_dueno`); la app no manda `user_id`.

## Lo que no se puede

- Escribir en `promociones` como `authenticated` ⇒ `42501 permission denied` (verificado).
- `jurisdiccion=neq.otra_provincia` **solo** excluye también las filas con jurisdicción `null`: siempre se usa el `or`.
- Pedir más de 1000 filas ⇒ PostgREST recorta sin error (`max_rows`): por eso las páginas son de 500.
