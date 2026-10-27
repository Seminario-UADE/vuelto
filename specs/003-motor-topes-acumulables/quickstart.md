# Quickstart: validar topes y acumulables

## Correr

```bash
npm ci
npm run test -w @vuelto/motor   # tests + cobertura (falla si baja de 90% de líneas)
npm run lint && npm run typecheck && npm run build
```

## Qué tiene que pasar

| Escenario | Test que lo cubre | Resultado esperado |
|---|---|---|
| US1-1 a US1-3: tope semanal (dentro, semana anterior, agotado) | `tope.test.ts`, `recomendar.test.ts` | ahorro, restante y base de cada escenario |
| US1-4: tope por compra | `recomendar.test.ts` | ahorro $3.000, restante y base `null`, motivo "por compra" |
| Semana que cruza de mes | `fecha.test.ts`, `tope.test.ts` | lunes 26/10 para una consulta del 1/11 |
| US2-1 a US2-6: acumulables | `recomendar.test.ts` | una opción combinada o separadas, según acumulabilidad y medio |
| US3-1 a US3-8: tope compartido | `tope.test.ts`, `recomendar.test.ts` | saldo del grupo, monto menor, vencidas solo consumo, reparto |
| Criterios de la issue #36 | suite existente, adaptada al contrato nuevo | siguen pasando |
| Cobertura ≥ 90% | `npm run test -w @vuelto/motor` | el reporte muestra ≥ 90% de líneas |
