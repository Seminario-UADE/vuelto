#!/usr/bin/env bash
# Auditoría de secretos (issue #55; RNF-04 y RNF-05 de docs/product/requisitos.md).
#
# Exporta el bundle web de la app y busca ahí, y en los archivos versionados del
# repo, las keys de Gemini y Groq y la service role key de Supabase. Tiene que
# dar 0 resultados.
#
# NUNCA imprime un secreto: si encuentra algo, informa qué tipo de patrón es,
# en qué archivo y cuántas veces, pero no la coincidencia.
#
# Uso (desde cualquier carpeta):
#   scripts/auditar-secretos.sh                # exporta el bundle y audita
#   scripts/auditar-secretos.sh --dir <carpeta> # audita un bundle ya exportado
#   scripts/auditar-secretos.sh --autotest      # solo prueba que el detector detecta
#
# Si están definidas GROQ_API_KEY, GEMINI_API_KEY o SUPABASE_SERVICE_ROLE_KEY en
# el entorno (p. ej. `set -a; . supabase/.env; set +a`), además se busca su valor
# literal: es la prueba más fuerte, porque busca TU key y no un patrón.
#
# Código de salida: 0 limpio, 1 hallazgos o fallo del autotest, 2 error de uso.

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR_BUNDLE=""
SOLO_AUTOTEST=0
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

while [ $# -gt 0 ]; do
  case "$1" in
    --dir) DIR_BUNDLE="${2:-}"; shift 2 ;;
    --autotest) SOLO_AUTOTEST=1; shift ;;
    -h|--help) sed -n '2,22p' "$0"; exit 0 ;;
    *) echo "Argumento desconocido: $1 (probá --help)" >&2; exit 2 ;;
  esac
done

# Patrones de keys. Se arman por partes para que este archivo no contenga
# literalmente una key de ejemplo que otro escáner del repo marcaría.
PAT_GEMINI='AIza[0-9A-Za-z_-]{35}'                  # Google API key (Gemini)
PAT_GROQ='gsk_[0-9A-Za-z]{20,}'                      # Groq API key
PAT_SB_SECRET='sb_secret_[0-9A-Za-z_-]{16,}'         # Supabase, formato nuevo de secret key
# La service role key vieja es un JWT con {"role":"service_role"} en el payload:
# se buscan los JWT y se decodifica el payload (ver `contar_service_role_jwt`).
PAT_JWT='eyJ[A-Za-z0-9_-]{5,}\.eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}'
# Nombres de las variables: en el bundle no tienen por qué aparecer nunca.
PAT_NOMBRES='(GEMINI_API_KEY|GROQ_API_KEY|SUPABASE_SERVICE_ROLE_KEY|GOOGLE_API_KEY)'

HALLAZGOS=0

hallazgo() { # $1 descripción, $2 archivo, $3 cantidad
  printf '  HALLAZGO: %s en %s (%s coincidencias; valor no mostrado)\n' "$1" "$2" "$3"
  HALLAZGOS=$((HALLAZGOS + 1))
}

# Cuenta cuántos JWT de un archivo tienen role=service_role (o rol distinto de
# anon/authenticated, que ya es sospechoso). Lee el payload con node.
contar_service_role_jwt() { # $1 archivo
  grep -aqE "$PAT_JWT" "$1" 2>/dev/null || { echo 0; return 0; }   # sin JWT: no se lanza node
  grep -aoE "$PAT_JWT" "$1" 2>/dev/null | node -e '
    const lineas = require("fs").readFileSync(0, "utf8").split("\n").filter(Boolean);
    let n = 0;
    for (const jwt of lineas) {
      try {
        const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
        if (payload.role === "service_role") n++;
      } catch { /* no era un JWT de verdad */ }
    }
    process.stdout.write(String(n));
  ' || echo 0
}

# Audita una lista de archivos (uno por línea en $1). Suma a HALLAZGOS.
auditar_archivos() { # $1 archivo con la lista, $2 "con-nombres" o "solo-valores"
  local archivo n par valor var
  local pares=("Key de Gemini|$PAT_GEMINI" "Key de Groq|$PAT_GROQ" "Secret key de Supabase|$PAT_SB_SECRET")
  if [ "${2:-con-nombres}" = "con-nombres" ]; then pares+=("Nombre de variable secreta|$PAT_NOMBRES"); fi
  while IFS= read -r archivo; do
    [ -f "$archivo" ] || continue
    for par in "${pares[@]}"; do
      n="$({ grep -aoE "${par#*|}" "$archivo" 2>/dev/null || true; } | wc -l | tr -d ' ')"
      if [ "$n" -gt 0 ]; then hallazgo "${par%%|*}" "$archivo" "$n"; fi
    done
    n="$(contar_service_role_jwt "$archivo")"
    if [ "$n" -gt 0 ]; then hallazgo "Service role key de Supabase (JWT)" "$archivo" "$n"; fi
    # Valor literal de las keys reales, si el entorno las trae.
    for var in GEMINI_API_KEY GROQ_API_KEY SUPABASE_SERVICE_ROLE_KEY; do
      valor="${!var:-}"
      if [ "${#valor}" -ge 16 ] && grep -aqF -- "$valor" "$archivo" 2>/dev/null; then
        hallazgo "Valor literal de $var" "$archivo" "≥1"
      fi
    done
  done < "$1"
  return 0
}

# --- Autotest: el detector tiene que detectar, si no "0 resultados" no prueba nada.
autotest() {
  local d="$TMP/autotest"
  mkdir -p "$d"
  local jwt_service jwt_anon
  jwt_service="$(node -e 'const b=o=>Buffer.from(JSON.stringify(o)).toString("base64url");process.stdout.write(b({alg:"HS256",typ:"JWT"})+"."+b({iss:"supabase-demo",role:"service_role"})+".firma_de_prueba_123")')"
  jwt_anon="$(node -e 'const b=o=>Buffer.from(JSON.stringify(o)).toString("base64url");process.stdout.write(b({alg:"HS256",typ:"JWT"})+"."+b({iss:"supabase-demo",role:"anon"})+".firma_de_prueba_123")')"
  printf 'var k="%s%s";\n' "AIza" "SyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q" > "$d/gemini.js"
  printf 'var k="%s%s";\n' "gsk_" "abcdefghijklmnopqrstuvwxyz0123456789" > "$d/groq.js"
  printf 'var k="%s";\n' "$jwt_service" > "$d/service-role.js"
  printf 'var k="%s%s";\n' "sb_secret_" "abcdefghijklmnop1234" > "$d/secret-nueva.js"
  printf 'var k=process.env.%s;\n' "GROQ_API_KEY" > "$d/nombre.js"
  printf 'var k="%s";\n' "$jwt_anon" > "$d/anon-ok.js"            # la anon key es pública: NO debe marcarse
  printf 'var x="nada que ver";\n' > "$d/limpio.js"

  find "$d" -type f | sort > "$TMP/lista-autotest"
  HALLAZGOS=0
  auditar_archivos "$TMP/lista-autotest" con-nombres > "$TMP/salida-autotest"
  local esperados=5 ok=1
  [ "$HALLAZGOS" -eq "$esperados" ] || ok=0
  grep -q 'anon-ok.js' "$TMP/salida-autotest" && ok=0
  grep -q 'limpio.js' "$TMP/salida-autotest" && ok=0
  # El autotest tampoco puede haber impreso los valores plantados.
  grep -qE "$PAT_GEMINI|$PAT_GROQ|$PAT_SB_SECRET|$PAT_JWT" "$TMP/salida-autotest" && ok=0
  if [ "$ok" -ne 1 ]; then
    echo "FALLA el autotest: el detector encontró $HALLAZGOS de $esperados hallazgos plantados (o marcó de más / imprimió un valor)." >&2
    return 1
  fi
  echo "Autotest OK: detecta las 5 keys plantadas, ignora la anon key y no imprime valores."
  HALLAZGOS=0
}

autotest || exit 1
if [ "$SOLO_AUTOTEST" -eq 1 ]; then exit 0; fi

# --- 1. Bundle web de la app (RNF-04, RNF-05)
if [ -z "$DIR_BUNDLE" ]; then
  DIR_BUNDLE="$TMP/bundle-web"
  echo "Exportando el bundle web de la app (npx expo export --platform web)…"
  # El motor se consume compilado (dist/), igual que en deploy-web.yml.
  (cd "$RAIZ" && npm run build -w @vuelto/motor > "$TMP/build-motor.log" 2>&1) \
    || { cat "$TMP/build-motor.log" >&2; echo "No se pudo compilar el motor." >&2; exit 2; }
  (cd "$RAIZ/apps/mobile" && npx expo export --platform web --output-dir "$DIR_BUNDLE" > "$TMP/export.log" 2>&1) \
    || { tail -n 30 "$TMP/export.log" >&2; echo "Falló expo export." >&2; exit 2; }
fi
[ -d "$DIR_BUNDLE" ] || { echo "No existe la carpeta del bundle: $DIR_BUNDLE" >&2; exit 2; }

find "$DIR_BUNDLE" -type f \( -name '*.js' -o -name '*.map' -o -name '*.html' -o -name '*.json' -o -name '*.css' \) | sort > "$TMP/lista-bundle"
N_BUNDLE="$(wc -l < "$TMP/lista-bundle" | tr -d ' ')"
[ "$N_BUNDLE" -gt 0 ] || { echo "El bundle está vacío: no hay nada que auditar." >&2; exit 2; }
# Un bundle sin JS no prueba nada (p. ej. si el export falló en silencio).
grep -q '\.js$' "$TMP/lista-bundle" || { echo "El bundle no tiene ningún .js." >&2; exit 2; }

echo "Auditando el bundle ($N_BUNDLE archivos de texto)…"
auditar_archivos "$TMP/lista-bundle" con-nombres

# --- 2. Archivos versionados del repo (RNF-05: "ni en el cliente ni en el repo")
# Acá no se buscan los nombres de las variables: la documentación y el código de
# la ingesta y de las Edge Functions los usan legítimamente. Solo valores.
echo "Auditando los archivos versionados del repo (solo valores de keys)…"
(cd "$RAIZ" && git ls-files -z) | while IFS= read -r -d '' f; do echo "$RAIZ/$f"; done > "$TMP/lista-repo"
auditar_archivos "$TMP/lista-repo" solo-valores

echo
if [ "$HALLAZGOS" -eq 0 ]; then
  echo "OK: 0 resultados de keys de Gemini, Groq ni service role de Supabase (bundle web y repo)."
  exit 0
fi
echo "FALLA: $HALLAZGOS hallazgo(s). Rotar la key afectada y sacarla del código antes de seguir." >&2
exit 1
