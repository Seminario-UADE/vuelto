# ADR-002: Expo (React Native) sobre Flutter

## Context

Hay que elegir cliente mobile para un equipo de cuatro personas, con costo
$0 durante el cuatrimestre, y que se pueda probar en un celular real lo
antes posible. El nivel real del equipo en TypeScript vs. Dart todavía no
está relevado.

## Decision

Expo (React Native).

## Rationale

- **Expo Go** permite probar en el celular propio de cada integrante
  escaneando un QR — sin compilar, sin cuenta de desarrollador, sin Mac para
  iPhone. Flutter no tiene equivalente: exige el SDK y, para iPhone, Xcode
  (solo en Mac).
- **Mismo lenguaje que el motor y la ingesta** (TypeScript). El paquete del
  motor de reglas corre igual en la app y en el backend sin reimplementarlo.
  Con Flutter, el motor habría que reescribirlo en Dart o dejarlo siempre
  del lado del servidor — perdiendo la recomendación sin señal.
- Para el pitch, los jurados también abren la app por QR, sin instalar nada.

## Consequences

- Notificaciones push no funcionan dentro de Expo Go — si el disparo
  contextual entra al alcance, hace falta un development build (EAS Build).
- Respaldo necesario para el día del pitch: llevar un build de EAS por si
  el servidor de desarrollo falla.
- Esta decisión es revisable si el resto del equipo resulta tener mejor
  nivel de Dart que de TypeScript — ver `../product/pendientes.md`.
