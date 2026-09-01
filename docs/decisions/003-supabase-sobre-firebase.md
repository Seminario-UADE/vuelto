# ADR-003: Supabase sobre Firebase

## Context

El modelo de datos (topes compartidos por banco, jurisdicciones, exclusiones
de tarjeta) es relacional por naturaleza. Se necesita backend + DB + Auth
gratis, sin pedir tarjeta, para un MVP de cátedra.

## Decision

Supabase (Postgres + Auth).

## Rationale

- Postgres relacional encaja mejor con el modelo de datos que una base
  documental como Firestore.
- El free tier de Supabase incluye Auth sin pedir tarjeta. El de Firebase
  (Spark) no trae Functions, y para tenerlas obliga a un plan que sí la
  pide.

## Consequences

- Row-level security hay que escribirla al crear cada tabla, no después: es
  donde se filtra la data cuando se configura mal, y acá se guarda consumo
  de personas.
- Límite del free tier: 500 MB de base, 50.000 usuarios — muy por encima del
  volumen de un MVP de cátedra, no se espera migrar a Pro durante el
  cuatrimestre.
