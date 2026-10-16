---
name: patron-propuesta-cruza-datos-entre-usuarios
description: En Vuelto, features que leen datos de otro usuario (contactos, grupo) chocan con RLS, RNF-05 (service role solo ingesta) y privacidad.md; revisar siempre ese triángulo
metadata:
  type: project
---

Detectado 2026-10-15 en `docs/product/propuesta-contactos-gasto-grupo.md`
(contactos por QR/link + leer topes ajenos). Todo el modelo de seguridad de
Vuelto asume un usuario aislado: `privacidad.md` "un usuario no puede leer el
registro de otro", RNF-05 service role key solo en ingesta, RNF-07 RLS por
tabla. Una feature que "hace un get" de datos de otra cuenta no tiene camino
de lectura legal: o se abre RLS (el cliente ve compras crudas ajenas) o la
Edge Function usa service role (viola RNF-05).

Además: el tope "restante" deriva del historial de compras (90 días) — exponer
el tope o su base ("según N compras") filtra historial. Y un contacto con 0
compras parece tener tope lleno, así que el motor lo favorece sesgadamente.

**Why:** los docs se escribieron para un usuario solo; el gasto en grupo nivel
0 evitó el problema declarando "sin cuentas ni topes ajenos".

**How to apply:** ante cualquier propuesta multi-usuario, preguntar en este
orden: (1) con qué credencial se leen los datos ajenos, (2) qué consentimiento
y revocación hay, (3) qué pasa con la base del tope (Principio V) cuando el
dato es de otro, (4) qué compra impacta qué tope (RF-11) y quién la confirma.
Relacionado: [[patron-motor-consume-datos-inexistentes]], [[project-docs-sin-requisitos]].
