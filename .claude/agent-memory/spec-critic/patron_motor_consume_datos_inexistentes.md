---
name: patron-motor-consume-datos-inexistentes
description: Patrón repetido en docs de Vuelto — la arquitectura describe entradas del motor de reglas (jurisdicción, sucursal, tope compartido) que ningún modelo de datos produce
metadata:
  type: project
---

Patrón que aparece varias veces en la documentación de Vuelto: un documento
describe una capacidad del motor de reglas cuyas **entradas no existen** en
`docs/architecture/01-data-models.md`.

Casos concretos detectados el 2026-09-19:
- `00-overview.md` dice que el motor evalúa "× jurisdicción", pero el Perfil de
  usuario (tres capas: medios de pago, comercios recurridos, gustos) no tiene
  ubicación.
- El modelo de Promoción exige "Comercios y sucursales adheridas", pero no hay
  entidad Comercio ni Sucursal, ni forma de que el usuario indique dónde está.
- El tope "compartido entre promociones del mismo banco" es un atributo de la
  Promoción, no una entidad Tope — dos promos no pueden apuntar al mismo objeto.
- No existe entidad de consumo de tope, aunque controlar el tope es el
  diferencial declarado del producto.

**Why:** la arquitectura se escribió como narrativa del flujo antes que como
modelo, y el modelo quedó como "resumen de entidades", no schema.

**How to apply:** en cada revisión de este repo, cruzá explícitamente cada
dimensión que la prosa atribuye al motor contra los campos del modelo de datos.
Es la fuente más productiva de hallazgos bloqueantes acá.
Relacionado: [[project-docs-sin-requisitos]], [[patron-pendientes-como-tapadero]].
