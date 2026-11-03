# Contrato con #42: `aplicarPendientes`

Función pura que #42 llama al mezclar lo que baja del servidor con lo que está pendiente en el teléfono.

```ts
function aplicarPendientes(
  filasDelServidor: Compra[],   // ya convertidas a la forma del motor por #42
  cola: Operacion[],
  userId: string | null,
): Compra[];
```

## Reglas

1. Se parte de `filasDelServidor`.
2. Cada operación `guardar` **del mismo dueño** (o sin dueño) cuya compra no está en la lista se agrega; si ya está (mismo `id`), no se duplica y gana la copia local.
3. Cada operación `borrar` **del mismo dueño** quita su `compraId` de la lista. Una compra con borrado pendiente no reaparece.
4. Las operaciones `rechazada` y `bloqueada` **se conservan** en la lista (siguen siendo compras del usuario, aunque no hayan subido).
5. Las operaciones de otro dueño se ignoran.
6. El resultado no tiene ids repetidos y se ordena como el slice (la más nueva primero).

## Lo que #42 debe respetar

- Relee el **período completo** en cada sincronización: la tabla no tiene borrado lógico ni `actualizada_en`, así que un borrado hecho en otro dispositivo solo se ve así.
- Llama a `aplicarPendientes` **después** de convertir y **antes** de escribir el slice.
- No toca la cola: el vaciado es de esta spec.

## Casos de prueba mínimos

Pendiente nueva se agrega una vez; pendiente que ya subió (mismo id en el servidor) no se duplica; borrado pendiente de una fila del servidor la oculta; rechazada se conserva; otro dueño se ignora; mezcla de las cuatro.
