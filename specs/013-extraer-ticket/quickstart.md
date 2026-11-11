# Quickstart: validar la lectura de tickets

## 1. Prueba manual con fotos reales (FR-019, antes de implementar el servicio)

Requisitos: Node ≥ 22.13 (Deno se baja con `npx`), la key de Groq y 3 fotos de tickets **guardadas fuera de la carpeta del repo**.

En una terminal de Git Bash **aparte, fuera de la sesión de IA**:

```bash
cd ~/Documents/UADE/Seminario/vuelto
read -rs GROQ_API_KEY && export GROQ_API_KEY      # pegar la key: no se ve ni queda en el historial
npx deno run --no-lock --config supabase/functions/extraer-ticket/deno.json \
  --allow-net=api.groq.com --allow-read --allow-env=GROQ_API_KEY \
  supabase/functions/extraer-ticket/prueba-manual.ts ~/fotos/t1.jpg ~/fotos/t2.jpg ~/fotos/t3.jpg
unset GROQ_API_KEY
```

Se comparte solo el JSON que imprime. **Pasa si** las 3 lecturas salen sin `ticket_ilegible` ni error de esquema y el monto es correcto en al menos 2. Si falla con el modo estricto, se repite con el modo de JSON libre (`--modo=json-libre`); si también falla, se vuelve al equipo con el respaldo del ADR-012.

## 2. Tests (sin red ni key)

```bash
npm run test -w @vuelto/supabase
npm run typecheck -w @vuelto/supabase
npm run lint -w @vuelto/supabase
```

Cubren: los 3 tickets de ejemplo con el extractor simulado, cada regla de normalización (US1-5 a US1-8), el tapado de datos personales (US2-2 a US2-7), cada código de error (SC-005) y que el esquema que recibe Groq y el validador tengan las mismas claves. Cobertura ≥ 90% de líneas.

## 3. Despliegue y prueba con la sesión de un usuario

```bash
npx supabase functions deploy extraer-ticket --project-ref wahvysbxwgbbyynjiczy --use-api
```

`GROQ_API_KEY` ya está en los secrets (issue #85). La prueba de punta a punta, con la cámara, es de la issue #49.

## 4. Revisión de privacidad

`rules-guardian` sobre el diff: ningún camino escribe la imagen (regla 4) y la key de Groq solo aparece en la Edge Function (regla 3).
