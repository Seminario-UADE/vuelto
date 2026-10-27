# Quickstart: validar la estimación de topes

```bash
npm ci
npm run test -w @vuelto/motor   # tests + cobertura (≥ 90% de líneas)
npm run lint && npm run typecheck && npm run build
```

| Escenario | Test | Resultado esperado |
|---|---|---|
| US1-1 a US1-9 | `estimar.test.ts` | una estimación por saldo, con tope, consumido, restante, base, período y medios |
| US2-1 a US2-9 | `estimar.test.ts` | estado, cifra y base exactos |
| Fin de período, día siguiente, mes | `fecha.test.ts` | 31/10, domingo 25/10, 1/11, 5/10, 1/1 |
| `clasificarTope` | `tope.test.ts` | sin tope, por compra y acumulable, con grupo solo si es miembro |
| Suite de las issues #36 y #37 | sin cambios en sus expectativas | sigue en verde (FR-013) |
| FR-012 | revisión de código | los campos de `tope` solo se leen en `clasificarTope` |
