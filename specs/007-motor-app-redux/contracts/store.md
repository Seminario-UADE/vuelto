# Contrato: store de la app (`apps/mobile/src/store`)

## Creación

```ts
crearStore(opciones: {
  almacenamiento: Almacenamiento;      // { getItem, setItem, removeItem } (AsyncStorage o Map)
  estadoInicial: Partial<RootState> | null; // tests
}): AppStore

rehidratar(): thunk                   // lee `vuelto.store.v1` (o `vuelto.perfil.v1`) y despacha `sesion/rehidratado`
useReloj(fuente: () => Date): void    // despacha `sesion/ahoraCambio` al montar, al volver a primer plano y a medianoche
```

## Acciones

| Slice | Acción | Payload |
|---|---|---|
| sesion | `ahoraCambio` | ISO string |
| sesion | `cuentaGuardada` | `{ email, proveedor } \| null` |
| sesion | `avisoMostrado` | `string \| null` |
| sesion | `escenarioElegido` | `"normal" \| "mes-vacio" \| "ticket-ilegible"` (también reemplaza `compras`) |
| sesion | `rehidratado` | partes válidas de `Persistido` (las atienden todos los slices) |
| sesion | `sesionCerrada` | — (vuelve todo al estado inicial salvo `ahora` e `hidratado`) |
| perfil | `mediosElegidos`, `comerciosElegidos` | `string[]` |
| perfil | `onboardingTerminado` | — |
| perfil | `invitacionPendiente` | `string \| null` |
| corpus | `corpusCargado` | `{ promociones, cargadoEn }` |
| compras | `compraAgregada` | `CompraRegistrada` (la arma el thunk `guardarCompra`) |
| simulacion | `comercioElegido` | `string \| null` (borra el monto si cambia el comercio) |
| simulacion | `montoCambiado` | `number \| null` (≤ 0 → `null`) |
| contactos | `contactoAgregado` / `contactoQuitado` | `Contacto` / id |
| contactos | `grupoArmado` | `PedidoGrupo \| null` |

Thunk `guardarCompra(borrador: BorradorCompra)`: valida monto y medio, evalúa con el motor
(FR-008) sobre `selectEntradasMotor` y despacha `compraAgregada`. Lanza `Error` con el mismo
mensaje que hoy si falta el monto o el medio.

## Selectores (todos memoizados; ninguno lee el reloj del sistema)

| Selector | Devuelve | Depende de |
|---|---|---|
| `selectEntradasMotor` | `{ perfil: Perfil (motor), promociones, compras, ahora: Date }` | perfil.medios, corpus, compras, sesion.ahora |
| `selectRecomendacion` | `Recomendacion \| null` (vista) | entradas, simulacion |
| `selectTopes` | `ResumenTopes` (vista) | entradas |
| `selectResumenCompras` | `ResumenCompras` (vista, mes en curso) | compras, sesion.ahora |
| `selectPerfilVista` | `Perfil` (vista: nombre, medios y comercios del usuario) | perfil |
| `selectComerciosFrecuentes` | `Comercio[]` | perfil.comercios |
| `selectHoy` | `FechaISO` | sesion.ahora |

`recomendacionVista(entradas, comercio, monto)` (en `data/calculo.ts`) es la misma función que usa
`selectRecomendacion`, para Revisá tu compra (R3).
