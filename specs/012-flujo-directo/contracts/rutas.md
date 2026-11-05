# Contrato de rutas y pantallas (spec 012)

El mapa de rutas de Expo Router después de la feature: qué existe, qué parámetros recibe y a dónde lleva cada acción. Es la referencia para las tareas y para generar las pantallas en Stitch.

## Mapa

| Ruta | Presentación | Estado | Recibe | Contenido |
|---|---|---|---|---|
| `(onboarding)/bienvenida` | pantalla | cambia | — | «Empezar» → `/medios` (US5) o `/registro` (sin US5) · «Ya tengo cuenta» → `/login` |
| `(onboarding)/medios` | stack, paso 1 de 2 | cambia (US5: sin sesión) | — | Igual que hoy. Con US5, guarda en `perfil.borrador` |
| `(onboarding)/comercios` | — | **se borra** | — | Sus chips pasan al componente `SelectorComercios` |
| `(onboarding)/primera-respuesta` | stack, paso 2 de 2 | **se rehace** | — | «¿Dónde comprás seguido?», chips (tocar = marcar y ver; × = desmarcar), recomendación del último tocado, «Seguir» / «Seguir sin elegir» |
| `(auth)/registro` | page sheet | cambia | — | Suma **nombre**. Con US5 se titula «Guardá tu perfil» y es el último paso |
| `(auth)/login` | page sheet | igual | — | — |
| `(auth)/confirmar-email` | page sheet | **nueva** (US5) | `email` | A qué dirección se mandó, «Ya confirmé, entrar» → `/login` |
| `(tabs)/compras` | tab 1 | **nueva** (ex `mis-compras`) | — | Por confirmar · «Escanear ticket» · «Cargar a mano» · resumen, filtros e historial |
| `(tabs)/index` | tab 2 (inicial) | cambia | — | Avatar → `/perfil` · tarjetas «por confirmar» · «¿Dónde vas a comprar?» · tarjeta con «Usar [medio]» y «Ver detalle» · topes · últimas compras. **Sin** la fila suelta «¿Ya compraste? Escaneá» |
| `(tabs)/topes` | tab 3 | igual (enlaces a `/compras`) | — | — |
| `(tabs)/comprar` | — | **se borra** | — | — |
| `perfil` | stack con header nativo | **movida** (ex tab) | — | Igual que la tab de hoy, con el nombre editable. Si `nombre` es `null`, «Cargá tu nombre» |
| `mis-compras` | — | redirección a `/compras` | — | — |
| `comercio/[id]` | stack | cambia | `id` | «Usar [medio]» crea la compra por confirmar y vuelve a Inicio. Mantiene «¿Pagan entre varios?» |
| `revisa` | page sheet | cambia | `modo`, `porConfirmar?`, datos del ticket | Con `porConfirmar`, precarga, medio sugerido sin seleccionar, elección de fecha y avisos (data-model) |
| `escanear` | full screen modal | cambia | `porConfirmar?` | Con `porConfirmar`: si el ticket coincide, va a `revisa?porConfirmar=…&modo=ticket`; si no, pregunta «¿Este ticket es de tu compra en X?». Sin él y con un cruce, pregunta «¿Es tu compra por confirmar en X?» |
| `descartar-por-confirmar` | form sheet (fit) | **nueva** | `id`, `comercio` | «¿Descartar la compra en X?», «Descartar» / «Cancelar» |

## Componentes nuevos o cambiados

- **`PorConfirmarCard`**: comercio, «Pagá con [medio]», monto si lo hay y antigüedad («hace 10 min»). Acciones: «Ya pagué» (primario), «Escanear ticket» (secundario) y «Descartar» (texto). Se usa en Inicio y en Compras.
- **`RecomendacionCard`**: suma un footer con «Usar [medio]» (primario sobre la tarjeta de decisión) cuando `r.medio` no es `null`.
- **`SelectorComercios`**: búsqueda y chips agrupados por rubro, extraídos de `comercios.tsx`. Lo usan la primera respuesta y Perfil.
- **Tab bar**: tres ítems y foco Salvia (research R6).
- **`AvatarBoton`**: el avatar con la inicial (o un ícono genérico sin nombre), de 44 pt, en el encabezado de Inicio.

## Avisos (toast)

| Evento | Texto |
|---|---|
| Compra por confirmar creada | «Pagá con [medio]. Cuando pagues, confirmala.» |
| Compra por confirmar reemplazada | «Actualizamos tu compra en [comercio].» |
| Compra confirmada | «Compra guardada. Tus topes están al día.» |
| Compra por confirmar descartada | «Descartaste la compra en [comercio].» |
